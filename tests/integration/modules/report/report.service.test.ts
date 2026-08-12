import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  CommunityVisibility,
  PostVisibility,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  UserRole,
  UserStatus,
} from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import { ReportService } from "../../../../src/app/module/report/report.service";
import AppError from "../../../../src/app/shared/errors/AppError";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestComment } from "../../../support/fixtures/comment.fixture";
import { createTestCommunity } from "../../../support/fixtures/community.fixture";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId)
  throw new Error("TEST_RUN_ID is required; use the integration runner");
const runId = `${testRunId}-report-service`;
const cleanup = createTestCleanup();
type TUser = Awaited<ReturnType<typeof createTestUser>>;
const actor = (user: TUser): Express.AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role: user.role,
  status: user.status,
});

const trackReport = (targetType: ReportTargetType, id: string) => {
  cleanup.add(`report:${targetType}:${id}`, () => {
    if (targetType === ReportTargetType.USER)
      return prisma.userReport.deleteMany({ where: { id } });
    if (targetType === ReportTargetType.POST)
      return prisma.postReport.deleteMany({ where: { id } });
    if (targetType === ReportTargetType.COMMENT)
      return prisma.commentReport.deleteMany({ where: { id } });
    return prisma.communityReport.deleteMany({ where: { id } });
  });
};

after(async () => {
  try {
    await cleanup.run();
  } finally {
    await prisma.$disconnect();
  }
});

test("Report submission validates visibility before active-case idempotency", async () => {
  const reporter = await createTestUser({
    cleanup,
    runId,
    label: "submit-reporter",
  });
  const author = await createTestUser({
    cleanup,
    runId,
    label: "submit-author",
  });
  const post = await createTestPost({ cleanup, runId, authorId: author.id });

  const first = await ReportService.createReport(actor(reporter), {
    target: { type: ReportTargetType.POST, id: post.id },
    reason: ReportReason.SPAM,
  });
  trackReport(ReportTargetType.POST, first.data.id);
  const duplicate = await ReportService.createReport(actor(reporter), {
    target: { type: ReportTargetType.POST, id: post.id },
    reason: ReportReason.HARASSMENT,
    details: "different input",
  });
  assert.equal(first.statusCode, 201);
  assert.equal(duplicate.statusCode, 200);
  assert.equal(duplicate.data.id, first.data.id);
  assert.equal(duplicate.data.reason, ReportReason.SPAM);
  assert.equal(duplicate.data.details, null);

  await prisma.post.update({
    where: { id: post.id },
    data: { isDeleted: true },
  });
  await assert.rejects(
    ReportService.createReport(actor(reporter), {
      target: { type: ReportTargetType.POST, id: post.id },
      reason: ReportReason.SPAM,
    }),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
});

test("Report ownership and target visibility boundaries are enforced", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "owner" });
  const outsider = await createTestUser({ cleanup, runId, label: "outsider" });
  const privatePost = await createTestPost({
    cleanup,
    runId,
    authorId: owner.id,
    visibility: PostVisibility.PRIVATE,
  });
  const privateCommunity = await createTestCommunity({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "private-community",
    visibility: CommunityVisibility.PRIVATE,
  });
  for (const target of [
    { type: ReportTargetType.USER, id: owner.id },
    { type: ReportTargetType.POST, id: privatePost.id },
    { type: ReportTargetType.COMMUNITY, id: privateCommunity.id },
  ]) {
    await assert.rejects(
      ReportService.createReport(actor(owner), {
        target,
        reason: ReportReason.SPAM,
      }),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
  }
  await assert.rejects(
    ReportService.createReport(actor(outsider), {
      target: { type: ReportTargetType.POST, id: privatePost.id },
      reason: ReportReason.SPAM,
    }),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
});

test("Unified Report cursor traverses same timestamp and ID by target rank", async () => {
  const reporter = await createTestUser({
    cleanup,
    runId,
    label: "cursor-reporter",
  });
  const target = await createTestUser({
    cleanup,
    runId,
    label: "cursor-target",
  });
  const post = await createTestPost({ cleanup, runId, authorId: target.id });
  const comment = await createTestComment({
    cleanup,
    runId,
    postId: post.id,
    authorId: target.id,
  });
  const community = await createTestCommunity({
    cleanup,
    runId,
    ownerId: target.id,
    label: "cursor-community",
  });
  const newest = await Promise.all([
    prisma.userReport.aggregate({ _max: { createdAt: true } }),
    prisma.postReport.aggregate({ _max: { createdAt: true } }),
    prisma.commentReport.aggregate({ _max: { createdAt: true } }),
    prisma.communityReport.aggregate({ _max: { createdAt: true } }),
  ]);
  const createdAt = new Date(
    Math.max(
      Date.now(),
      ...newest.map((item) => item._max.createdAt?.getTime() ?? 0),
    ) + 1000,
  );
  const sharedId = "cm99999999999999999999999";
  const common = {
    id: sharedId,
    reporterId: reporter.id,
    reason: ReportReason.SPAM,
    createdAt,
  };
  await prisma.userReport.create({
    data: { ...common, reportedUserId: target.id },
  });
  trackReport(ReportTargetType.USER, sharedId);
  await prisma.postReport.create({ data: { ...common, postId: post.id } });
  trackReport(ReportTargetType.POST, sharedId);
  await prisma.commentReport.create({
    data: { ...common, commentId: comment.id },
  });
  trackReport(ReportTargetType.COMMENT, sharedId);
  await prisma.communityReport.create({
    data: { ...common, communityId: community.id },
  });
  trackReport(ReportTargetType.COMMUNITY, sharedId);

  const actual: ReportTargetType[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 4; page += 1) {
    const result = await ReportService.getReports({ limit: 1, cursor });
    actual.push(result.data[0]!.targetType);
    cursor = result.meta.nextCursor ?? undefined;
  }
  assert.deepEqual(actual, [
    ReportTargetType.USER,
    ReportTargetType.POST,
    ReportTargetType.COMMENT,
    ReportTargetType.COMMUNITY,
  ]);
  assert.equal(new Set(actual).size, 4);
});

test("Report status transitions audit atomically and same-state is no-write", async () => {
  const reporter = await createTestUser({
    cleanup,
    runId,
    label: "status-reporter",
  });
  const target = await createTestUser({
    cleanup,
    runId,
    label: "status-target",
  });
  const admin = await createTestUser({ cleanup, runId, label: "status-admin" });
  await prisma.user.update({
    where: { id: admin.id },
    data: { role: UserRole.ADMIN },
  });
  const created = await ReportService.createReport(actor(reporter), {
    target: { type: ReportTargetType.USER, id: target.id },
    reason: ReportReason.IMPERSONATION,
  });
  trackReport(ReportTargetType.USER, created.data.id);
  const reviewer = { ...actor(admin), role: UserRole.ADMIN };
  const reviewed = await ReportService.updateReportStatus(
    created.data.id,
    ReportStatus.REVIEWED,
    reviewer,
  );
  assert.equal(reviewed.status, ReportStatus.REVIEWED);
  assert.equal(reviewed.reviewedBy?.id, admin.id);
  assert.ok(reviewed.reviewedAt);
  const before = await prisma.userReport.findUniqueOrThrow({
    where: { id: created.data.id },
  });
  const converged = await ReportService.updateReportStatus(
    created.data.id,
    ReportStatus.REVIEWED,
    reviewer,
  );
  const after = await prisma.userReport.findUniqueOrThrow({
    where: { id: created.data.id },
  });
  assert.equal(converged.status, ReportStatus.REVIEWED);
  assert.equal(after.updatedAt.getTime(), before.updatedAt.getTime());
  assert.equal(after.reviewedAt?.getTime(), before.reviewedAt?.getTime());

  const resolved = await ReportService.updateReportStatus(
    created.data.id,
    ReportStatus.RESOLVED,
    reviewer,
  );
  assert.equal(resolved.status, ReportStatus.RESOLVED);
  await assert.rejects(
    ReportService.updateReportStatus(
      created.data.id,
      ReportStatus.REVIEWED,
      reviewer,
    ),
    (error: unknown) => error instanceof AppError && error.statusCode === 409,
  );
});

test("Concurrent duplicate submissions converge on one active case", async () => {
  const reporter = await createTestUser({
    cleanup,
    runId,
    label: "duplicate-reporter",
  });
  const target = await createTestUser({
    cleanup,
    runId,
    label: "duplicate-target",
  });
  const results = await Promise.all([
    ReportService.createReport(actor(reporter), {
      target: { type: ReportTargetType.USER, id: target.id },
      reason: ReportReason.SPAM,
    }),
    ReportService.createReport(actor(reporter), {
      target: { type: ReportTargetType.USER, id: target.id },
      reason: ReportReason.HARASSMENT,
    }),
  ]);
  const ids = new Set(results.map((result) => result.data.id));
  ids.forEach((id) => trackReport(ReportTargetType.USER, id));

  assert.deepEqual(
    results.map((result) => result.statusCode).sort(),
    [200, 201],
  );
  assert.equal(ids.size, 1);
  assert.equal(
    await prisma.userReport.count({
      where: {
        reporterId: reporter.id,
        reportedUserId: target.id,
        status: { in: [ReportStatus.PENDING, ReportStatus.REVIEWED] },
      },
    }),
    1,
  );
});

test("Terminal Report cases allow a new active case", async () => {
  const reporter = await createTestUser({
    cleanup,
    runId,
    label: "terminal-reporter",
  });
  const target = await createTestUser({
    cleanup,
    runId,
    label: "terminal-target",
  });
  const admin = await createTestUser({
    cleanup,
    runId,
    label: "terminal-admin",
  });
  const reviewer = { ...actor(admin), role: UserRole.ADMIN };

  const first = await ReportService.createReport(actor(reporter), {
    target: { type: ReportTargetType.USER, id: target.id },
    reason: ReportReason.SPAM,
  });
  trackReport(ReportTargetType.USER, first.data.id);
  await ReportService.updateReportStatus(
    first.data.id,
    ReportStatus.RESOLVED,
    reviewer,
  );
  const second = await ReportService.createReport(actor(reporter), {
    target: { type: ReportTargetType.USER, id: target.id },
    reason: ReportReason.HARASSMENT,
  });
  trackReport(ReportTargetType.USER, second.data.id);
  assert.equal(second.statusCode, 201);
  assert.notEqual(second.data.id, first.data.id);

  await ReportService.updateReportStatus(
    second.data.id,
    ReportStatus.REJECTED,
    reviewer,
  );
  const third = await ReportService.createReport(actor(reporter), {
    target: { type: ReportTargetType.USER, id: target.id },
    reason: ReportReason.PRIVACY,
  });
  trackReport(ReportTargetType.USER, third.data.id);
  assert.equal(third.statusCode, 201);
  assert.notEqual(third.data.id, second.data.id);
});

test("Concurrent same-status updates converge on one audit transition", async () => {
  const reporter = await createTestUser({
    cleanup,
    runId,
    label: "same-status-reporter",
  });
  const target = await createTestUser({
    cleanup,
    runId,
    label: "same-status-target",
  });
  const firstAdmin = await createTestUser({
    cleanup,
    runId,
    label: "same-status-admin-a",
  });
  const secondAdmin = await createTestUser({
    cleanup,
    runId,
    label: "same-status-admin-b",
  });
  const created = await ReportService.createReport(actor(reporter), {
    target: { type: ReportTargetType.USER, id: target.id },
    reason: ReportReason.IMPERSONATION,
  });
  trackReport(ReportTargetType.USER, created.data.id);
  const results = await Promise.all([
    ReportService.updateReportStatus(created.data.id, ReportStatus.REVIEWED, {
      ...actor(firstAdmin),
      role: UserRole.ADMIN,
    }),
    ReportService.updateReportStatus(created.data.id, ReportStatus.REVIEWED, {
      ...actor(secondAdmin),
      role: UserRole.ADMIN,
    }),
  ]);
  assert.ok(results.every((result) => result.status === ReportStatus.REVIEWED));
  const stored = await prisma.userReport.findUniqueOrThrow({
    where: { id: created.data.id },
  });
  assert.ok(
    stored.reviewedById === firstAdmin.id ||
      stored.reviewedById === secondAdmin.id,
  );
  assert.ok(
    results.every((result) => result.reviewedBy?.id === stored.reviewedById),
  );
});

test("Concurrent different-status updates never return competing audit data", async () => {
  const reporter = await createTestUser({
    cleanup,
    runId,
    label: "different-status-reporter",
  });
  const target = await createTestUser({
    cleanup,
    runId,
    label: "different-status-target",
  });
  const reviewAdmin = await createTestUser({
    cleanup,
    runId,
    label: "different-status-reviewer",
  });
  const resolveAdmin = await createTestUser({
    cleanup,
    runId,
    label: "different-status-resolver",
  });
  const created = await ReportService.createReport(actor(reporter), {
    target: { type: ReportTargetType.USER, id: target.id },
    reason: ReportReason.HARASSMENT,
  });
  trackReport(ReportTargetType.USER, created.data.id);
  const results = await Promise.allSettled([
    ReportService.updateReportStatus(created.data.id, ReportStatus.REVIEWED, {
      ...actor(reviewAdmin),
      role: UserRole.ADMIN,
    }),
    ReportService.updateReportStatus(created.data.id, ReportStatus.RESOLVED, {
      ...actor(resolveAdmin),
      role: UserRole.ADMIN,
    }),
  ]);
  const reviewResult = results[0]!;
  const resolveResult = results[1]!;
  if (reviewResult.status === "fulfilled") {
    assert.equal(reviewResult.value.status, ReportStatus.REVIEWED);
    assert.equal(reviewResult.value.reviewedBy?.id, reviewAdmin.id);
  } else {
    assert.ok(
      reviewResult.reason instanceof AppError &&
        reviewResult.reason.statusCode === 409,
    );
  }
  if (resolveResult.status === "fulfilled") {
    assert.equal(resolveResult.value.status, ReportStatus.RESOLVED);
    assert.equal(resolveResult.value.reviewedBy?.id, resolveAdmin.id);
  } else {
    assert.ok(
      resolveResult.reason instanceof AppError &&
        resolveResult.reason.statusCode === 409,
    );
  }
  assert.ok(results.some((result) => result.status === "fulfilled"));
});

test("Sequential status transitions return their own reviewer audits", async () => {
  const reporter = await createTestUser({
    cleanup,
    runId,
    label: "sequential-reporter",
  });
  const target = await createTestUser({
    cleanup,
    runId,
    label: "sequential-target",
  });
  const reviewAdmin = await createTestUser({
    cleanup,
    runId,
    label: "sequential-reviewer",
  });
  const resolveAdmin = await createTestUser({
    cleanup,
    runId,
    label: "sequential-resolver",
  });
  const created = await ReportService.createReport(actor(reporter), {
    target: { type: ReportTargetType.USER, id: target.id },
    reason: ReportReason.HATE_SPEECH,
  });
  trackReport(ReportTargetType.USER, created.data.id);
  const reviewed = await ReportService.updateReportStatus(
    created.data.id,
    ReportStatus.REVIEWED,
    { ...actor(reviewAdmin), role: UserRole.ADMIN },
  );
  const resolved = await ReportService.updateReportStatus(
    created.data.id,
    ReportStatus.RESOLVED,
    { ...actor(resolveAdmin), role: UserRole.ADMIN },
  );
  assert.equal(reviewed.status, ReportStatus.REVIEWED);
  assert.equal(reviewed.reviewedBy?.id, reviewAdmin.id);
  assert.equal(resolved.status, ReportStatus.RESOLVED);
  assert.equal(resolved.reviewedBy?.id, resolveAdmin.id);
});

test("Every Report target enforces visibility and ownership", async () => {
  const reporter = await createTestUser({
    cleanup,
    runId,
    label: "matrix-reporter",
  });
  const author = await createTestUser({
    cleanup,
    runId,
    label: "matrix-author",
  });
  const suspended = await createTestUser({
    cleanup,
    runId,
    label: "matrix-suspended",
    status: UserStatus.SUSPENDED,
  });
  const post = await createTestPost({ cleanup, runId, authorId: author.id });
  const comment = await createTestComment({
    cleanup,
    runId,
    postId: post.id,
    authorId: author.id,
  });
  const community = await createTestCommunity({
    cleanup,
    runId,
    ownerId: author.id,
    label: "matrix-community",
  });
  for (const target of [
    { type: ReportTargetType.USER, id: author.id },
    { type: ReportTargetType.POST, id: post.id },
    { type: ReportTargetType.COMMENT, id: comment.id },
    { type: ReportTargetType.COMMUNITY, id: community.id },
  ]) {
    const result = await ReportService.createReport(actor(reporter), {
      target,
      reason: ReportReason.SPAM,
    });
    trackReport(target.type, result.data.id);
    assert.equal(result.statusCode, 201);
  }
  await assert.rejects(
    ReportService.createReport(actor(reporter), {
      target: { type: ReportTargetType.USER, id: suspended.id },
      reason: ReportReason.SPAM,
    }),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
  await prisma.post.update({
    where: { id: post.id },
    data: { visibility: PostVisibility.PRIVATE },
  });
  await assert.rejects(
    ReportService.createReport(actor(reporter), {
      target: { type: ReportTargetType.COMMENT, id: comment.id },
      reason: ReportReason.SPAM,
    }),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
  await prisma.community.update({
    where: { id: community.id },
    data: { visibility: CommunityVisibility.PRIVATE },
  });
  await assert.rejects(
    ReportService.createReport(actor(reporter), {
      target: { type: ReportTargetType.COMMUNITY, id: community.id },
      reason: ReportReason.SPAM,
    }),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
});

test("Admin moderation summaries retain unavailable target state", async () => {
  const reporter = await createTestUser({
    cleanup,
    runId,
    label: "summary-reporter",
  });
  const target = await createTestUser({
    cleanup,
    runId,
    label: "summary-target",
  });
  const post = await createTestPost({ cleanup, runId, authorId: target.id });
  const comment = await createTestComment({
    cleanup,
    runId,
    postId: post.id,
    authorId: target.id,
  });
  const community = await createTestCommunity({
    cleanup,
    runId,
    ownerId: target.id,
    label: "summary-community",
  });
  const reports = await Promise.all([
    ReportService.createReport(actor(reporter), {
      target: { type: ReportTargetType.USER, id: target.id },
      reason: ReportReason.SPAM,
    }),
    ReportService.createReport(actor(reporter), {
      target: { type: ReportTargetType.POST, id: post.id },
      reason: ReportReason.SPAM,
    }),
    ReportService.createReport(actor(reporter), {
      target: { type: ReportTargetType.COMMENT, id: comment.id },
      reason: ReportReason.SPAM,
    }),
    ReportService.createReport(actor(reporter), {
      target: { type: ReportTargetType.COMMUNITY, id: community.id },
      reason: ReportReason.SPAM,
    }),
  ]);
  reports.forEach((report) =>
    trackReport(report.data.targetType, report.data.id),
  );
  const unavailableAt = new Date();
  await Promise.all([
    prisma.user.update({
      where: { id: target.id },
      data: { status: UserStatus.SUSPENDED, deletedAt: unavailableAt },
    }),
    prisma.post.update({ where: { id: post.id }, data: { isDeleted: true } }),
    prisma.comment.update({
      where: { id: comment.id },
      data: { isDeleted: true },
    }),
    prisma.community.update({
      where: { id: community.id },
      data: { isSuspended: true, deletedAt: unavailableAt },
    }),
  ]);
  const details = await Promise.all(
    reports.map((report) => ReportService.getReportById(report.data.id)),
  );
  const userTarget = details.find(
    (report) => report.target.type === ReportTargetType.USER,
  )!.target;
  const postTarget = details.find(
    (report) => report.target.type === ReportTargetType.POST,
  )!.target;
  const commentTarget = details.find(
    (report) => report.target.type === ReportTargetType.COMMENT,
  )!.target;
  const communityTarget = details.find(
    (report) => report.target.type === ReportTargetType.COMMUNITY,
  )!.target;
  assert.equal(
    userTarget.type === "USER" && userTarget.status,
    UserStatus.SUSPENDED,
  );
  assert.equal(postTarget.type === "POST" && postTarget.isDeleted, true);
  assert.equal(
    commentTarget.type === "COMMENT" && commentTarget.isDeleted,
    true,
  );
  assert.equal(
    communityTarget.type === "COMMUNITY" && communityTarget.isSuspended,
    true,
  );
});

test("Report cursor continues after its physical row is deleted", async () => {
  const reporter = await createTestUser({
    cleanup,
    runId,
    label: "deleted-cursor-reporter",
  });
  const target = await createTestUser({
    cleanup,
    runId,
    label: "deleted-cursor-target",
  });
  const newest = await prisma.userReport.aggregate({
    _max: { createdAt: true },
  });
  const base =
    Math.max(Date.now(), newest._max.createdAt?.getTime() ?? 0) + 1000;
  const controlled = [];
  for (let index = 0; index < 3; index += 1) {
    const row = await prisma.userReport.create({
      data: {
        reporterId: reporter.id,
        reportedUserId: target.id,
        reason: ReportReason.SPAM,
        createdAt: new Date(base + index * 1000),
      },
    });
    controlled.push(row);
    trackReport(ReportTargetType.USER, row.id);
  }
  const expected = [...controlled].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
  const first = await ReportService.getReports({ limit: 1 });
  assert.equal(first.data[0]?.id, expected[0]?.id);
  await prisma.userReport.delete({ where: { id: expected[0]!.id } });
  const second = await ReportService.getReports({
    limit: 1,
    cursor: first.meta.nextCursor ?? undefined,
  });
  assert.equal(second.data[0]?.id, expected[1]?.id);
});

test("Cross-table Report identity conflicts reject reads and writes", async () => {
  const reporter = await createTestUser({
    cleanup,
    runId,
    label: "identity-reporter",
  });
  const target = await createTestUser({
    cleanup,
    runId,
    label: "identity-target",
  });
  const post = await createTestPost({ cleanup, runId, authorId: target.id });
  const sharedId = "cm77777777777777777777777";
  await prisma.userReport.create({
    data: {
      id: sharedId,
      reporterId: reporter.id,
      reportedUserId: target.id,
      reason: ReportReason.SPAM,
    },
  });
  trackReport(ReportTargetType.USER, sharedId);
  await prisma.postReport.create({
    data: {
      id: sharedId,
      reporterId: reporter.id,
      postId: post.id,
      reason: ReportReason.SPAM,
    },
  });
  trackReport(ReportTargetType.POST, sharedId);
  const before = await Promise.all([
    prisma.userReport.findUniqueOrThrow({ where: { id: sharedId } }),
    prisma.postReport.findUniqueOrThrow({ where: { id: sharedId } }),
  ]);
  await assert.rejects(
    ReportService.getReportById(sharedId),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.message === "Report identity conflict",
  );
  await assert.rejects(
    ReportService.updateReportStatus(sharedId, ReportStatus.REVIEWED, {
      ...actor(reporter),
      role: UserRole.ADMIN,
    }),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.message === "Report identity conflict",
  );
  const after = await Promise.all([
    prisma.userReport.findUniqueOrThrow({ where: { id: sharedId } }),
    prisma.postReport.findUniqueOrThrow({ where: { id: sharedId } }),
  ]);
  assert.deepEqual(after, before);
});
