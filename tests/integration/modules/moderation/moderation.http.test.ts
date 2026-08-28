import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import app from "../../../../src/app";
import {
  CommunityMemberRole,
  CommunityMemberStatus,
  ReportReason,
  ReportStatus,
  ReportTargetType,
  UserRole,
} from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import { installAuthSessionStub } from "../../../support/auth/auth-session.stub";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestComment } from "../../../support/fixtures/comment.fixture";
import { createTestCommunity } from "../../../support/fixtures/community.fixture";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";
import { startTestServer } from "../../../support/server/test-server";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId) {
  throw new Error("TEST_RUN_ID is required; use the integration runner");
}

const runId = `${testRunId}-moderation-http`;
const cleanup = createTestCleanup();
let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let restoreAuth: (() => void) | undefined;

const ids = {
  platformModeratorMember: "",
  communityModerator: "",
  dualModerator: "",
  ownerWithoutMembership: "",
  managedMember: "",
  contentAuthor: "",
  reportTargetUser: "",
  reportPost: "",
  reportComment: "",
  reportCommunity: "",
  memberDeniedPost: "",
  communityModeratorPost: "",
  dualModeratorPost: "",
  ownerPost: "",
  ownerComment: "",
  globalDeniedPost: "",
  globalDeniedComment: "",
  communityModeratorComment: "",
  suspendedPost: "",
  suspendedComment: "",
  deletedCommunityPost: "",
  deletedCommunityComment: "",
  community: "",
  reporterEmail: "",
  moderatorEmail: "",
};

const reportIds: Record<ReportTargetType, string> = {
  USER: "",
  POST: "",
  COMMENT: "",
  COMMUNITY: "",
};

const reportTargetIds: Record<ReportTargetType, string> = {
  USER: "",
  POST: "",
  COMMENT: "",
  COMMUNITY: "",
};

type TReportUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  deletedAt: string | null;
};

type TReportData = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  reporter: TReportUser;
  reviewedBy: TReportUser | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  target: { type: ReportTargetType; id: string } & Record<string, unknown>;
};

const request = async (
  method: "GET" | "PATCH" | "DELETE",
  path: string,
  userId: string,
  body?: unknown,
) => {
  const headers: Record<string, string> = { "x-test-user-id": userId };
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

const trackMemberships = (memberships: { id: string }[]) => {
  cleanup.add("moderation-memberships", () =>
    prisma.communityMember.deleteMany({
      where: { id: { in: memberships.map((membership) => membership.id) } },
    }),
  );
};

const trackReports = (reports: { type: ReportTargetType; id: string }[]) => {
  for (const report of reports) {
    cleanup.add(`moderation-report:${report.type}:${report.id}`, () => {
      if (report.type === ReportTargetType.USER) {
        return prisma.userReport.deleteMany({ where: { id: report.id } });
      }
      if (report.type === ReportTargetType.POST) {
        return prisma.postReport.deleteMany({ where: { id: report.id } });
      }
      if (report.type === ReportTargetType.COMMENT) {
        return prisma.commentReport.deleteMany({ where: { id: report.id } });
      }
      return prisma.communityReport.deleteMany({ where: { id: report.id } });
    });
  }
};

before(async () => {
  const platformModeratorMember = await createTestUser({
    cleanup,
    runId,
    label: "platform-moderator-member",
  });
  const communityModerator = await createTestUser({
    cleanup,
    runId,
    label: "community-moderator",
  });
  const dualModerator = await createTestUser({
    cleanup,
    runId,
    label: "dual-moderator",
  });
  const ownerWithoutMembership = await createTestUser({
    cleanup,
    runId,
    label: "owner-without-membership",
  });
  const contentAuthor = await createTestUser({
    cleanup,
    runId,
    label: "content-author",
  });
  const managedMember = await createTestUser({
    cleanup,
    runId,
    label: "managed-member",
  });
  const reportTargetUser = await createTestUser({
    cleanup,
    runId,
    label: "report-target-user",
  });

  await prisma.user.updateMany({
    where: { id: { in: [platformModeratorMember.id, dualModerator.id] } },
    data: { role: UserRole.MODERATOR },
  });

  const community = await createTestCommunity({
    cleanup,
    runId,
    ownerId: contentAuthor.id,
    label: "role-scope",
  });
  const ownerCommunity = await createTestCommunity({
    cleanup,
    runId,
    ownerId: ownerWithoutMembership.id,
    label: "owner-no-membership",
  });
  const suspendedCommunity = await createTestCommunity({
    cleanup,
    runId,
    ownerId: contentAuthor.id,
    label: "suspended-scope",
    isSuspended: true,
  });
  const deletedCommunity = await createTestCommunity({
    cleanup,
    runId,
    ownerId: contentAuthor.id,
    label: "deleted-scope",
    deletedAt: new Date(),
  });
  const reportCommunity = await createTestCommunity({
    cleanup,
    runId,
    ownerId: contentAuthor.id,
    label: "report-target",
  });
  await prisma.community.update({
    where: { id: reportCommunity.id },
    data: { description: `${runId} report community description` },
  });

  const memberships = await Promise.all([
    prisma.communityMember.create({
      data: {
        communityId: community.id,
        userId: platformModeratorMember.id,
        role: CommunityMemberRole.MEMBER,
        status: CommunityMemberStatus.ACTIVE,
      },
    }),
    prisma.communityMember.create({
      data: {
        communityId: community.id,
        userId: communityModerator.id,
        role: CommunityMemberRole.MODERATOR,
        status: CommunityMemberStatus.ACTIVE,
      },
    }),
    prisma.communityMember.create({
      data: {
        communityId: community.id,
        userId: dualModerator.id,
        role: CommunityMemberRole.MODERATOR,
        status: CommunityMemberStatus.ACTIVE,
      },
    }),
    prisma.communityMember.create({
      data: {
        communityId: community.id,
        userId: managedMember.id,
        role: CommunityMemberRole.MEMBER,
        status: CommunityMemberStatus.ACTIVE,
      },
    }),
    prisma.communityMember.create({
      data: {
        communityId: suspendedCommunity.id,
        userId: communityModerator.id,
        role: CommunityMemberRole.MODERATOR,
        status: CommunityMemberStatus.ACTIVE,
      },
    }),
    prisma.communityMember.create({
      data: {
        communityId: deletedCommunity.id,
        userId: communityModerator.id,
        role: CommunityMemberRole.MODERATOR,
        status: CommunityMemberStatus.ACTIVE,
      },
    }),
  ]);
  trackMemberships(memberships);

  const memberDeniedPost = await createTestPost({
    cleanup,
    runId,
    authorId: contentAuthor.id,
    communityId: community.id,
  });
  const communityModeratorPost = await createTestPost({
    cleanup,
    runId,
    authorId: contentAuthor.id,
    communityId: community.id,
  });
  const dualModeratorPost = await createTestPost({
    cleanup,
    runId,
    authorId: contentAuthor.id,
    communityId: community.id,
  });
  const commentPost = await createTestPost({
    cleanup,
    runId,
    authorId: contentAuthor.id,
    communityId: community.id,
  });
  const ownerPost = await createTestPost({
    cleanup,
    runId,
    authorId: contentAuthor.id,
    communityId: ownerCommunity.id,
  });
  const ownerCommentPost = await createTestPost({
    cleanup,
    runId,
    authorId: contentAuthor.id,
    communityId: ownerCommunity.id,
  });
  const globalDeniedPost = await createTestPost({
    cleanup,
    runId,
    authorId: contentAuthor.id,
  });
  const globalDeniedCommentPost = await createTestPost({
    cleanup,
    runId,
    authorId: contentAuthor.id,
  });
  const suspendedPost = await createTestPost({
    cleanup,
    runId,
    authorId: contentAuthor.id,
    communityId: suspendedCommunity.id,
  });
  const deletedCommunityPost = await createTestPost({
    cleanup,
    runId,
    authorId: contentAuthor.id,
    communityId: deletedCommunity.id,
  });
  const reportPost = await createTestPost({
    cleanup,
    runId,
    authorId: contentAuthor.id,
    content: `${runId} report target post`,
  });

  const communityModeratorComment = await createTestComment({
    cleanup,
    runId,
    postId: commentPost.id,
    authorId: contentAuthor.id,
    label: "community-moderator-comment",
  });
  const ownerComment = await createTestComment({
    cleanup,
    runId,
    postId: ownerCommentPost.id,
    authorId: contentAuthor.id,
    label: "owner-comment",
  });
  const globalDeniedComment = await createTestComment({
    cleanup,
    runId,
    postId: globalDeniedCommentPost.id,
    authorId: contentAuthor.id,
    label: "global-denied-comment",
  });
  const suspendedComment = await createTestComment({
    cleanup,
    runId,
    postId: suspendedPost.id,
    authorId: contentAuthor.id,
    label: "suspended-comment",
  });
  const deletedCommunityComment = await createTestComment({
    cleanup,
    runId,
    postId: deletedCommunityPost.id,
    authorId: contentAuthor.id,
    label: "deleted-community-comment",
  });
  const reportComment = await createTestComment({
    cleanup,
    runId,
    postId: reportPost.id,
    authorId: contentAuthor.id,
    label: "report-target-comment",
  });

  const reportCreatedAt = new Date(Date.now() + 60_000);
  const reports = [
    {
      type: ReportTargetType.USER,
      row: await prisma.userReport.create({
        data: {
          reporterId: communityModerator.id,
          reportedUserId: reportTargetUser.id,
          reason: ReportReason.SPAM,
          details: `${runId} user report`,
          createdAt: reportCreatedAt,
        },
      }),
    },
    {
      type: ReportTargetType.POST,
      row: await prisma.postReport.create({
        data: {
          reporterId: communityModerator.id,
          postId: reportPost.id,
          reason: ReportReason.SPAM,
          details: `${runId} post report`,
          createdAt: reportCreatedAt,
        },
      }),
    },
    {
      type: ReportTargetType.COMMENT,
      row: await prisma.commentReport.create({
        data: {
          reporterId: communityModerator.id,
          commentId: reportComment.id,
          reason: ReportReason.SPAM,
          details: `${runId} comment report`,
          createdAt: reportCreatedAt,
        },
      }),
    },
    {
      type: ReportTargetType.COMMUNITY,
      row: await prisma.communityReport.create({
        data: {
          reporterId: communityModerator.id,
          communityId: reportCommunity.id,
          reason: ReportReason.SPAM,
          details: `${runId} community report`,
          createdAt: reportCreatedAt,
        },
      }),
    },
  ];
  trackReports(reports.map(({ type, row }) => ({ type, id: row.id })));

  Object.assign(ids, {
    platformModeratorMember: platformModeratorMember.id,
    communityModerator: communityModerator.id,
    dualModerator: dualModerator.id,
    ownerWithoutMembership: ownerWithoutMembership.id,
    managedMember: managedMember.id,
    contentAuthor: contentAuthor.id,
    reportTargetUser: reportTargetUser.id,
    reportPost: reportPost.id,
    reportComment: reportComment.id,
    reportCommunity: reportCommunity.id,
    memberDeniedPost: memberDeniedPost.id,
    communityModeratorPost: communityModeratorPost.id,
    dualModeratorPost: dualModeratorPost.id,
    ownerPost: ownerPost.id,
    ownerComment: ownerComment.id,
    globalDeniedPost: globalDeniedPost.id,
    globalDeniedComment: globalDeniedComment.id,
    communityModeratorComment: communityModeratorComment.id,
    suspendedPost: suspendedPost.id,
    suspendedComment: suspendedComment.id,
    deletedCommunityPost: deletedCommunityPost.id,
    deletedCommunityComment: deletedCommunityComment.id,
    community: community.id,
    reporterEmail: communityModerator.email,
    moderatorEmail: dualModerator.email,
  });
  Object.assign(
    reportIds,
    Object.fromEntries(reports.map(({ type, row }) => [type, row.id])),
  );
  Object.assign(reportTargetIds, {
    USER: reportTargetUser.id,
    POST: reportPost.id,
    COMMENT: reportComment.id,
    COMMUNITY: reportCommunity.id,
  });

  restoreAuth = installAuthSessionStub(`${runId}-session`);
  const server = await startTestServer(app);
  baseUrl = server.baseUrl;
  closeServer = server.close;
});

after(async () => {
  restoreAuth?.();
  await closeServer?.();
  try {
    await cleanup.run();
  } finally {
    await prisma.$disconnect();
  }
});

test("Platform and Community moderator roles remain independent and additive", async () => {
  assert.equal(
    (await request("GET", "/api/v1/reports", ids.platformModeratorMember))
      .status,
    200,
  );
  assert.equal(
    (
      await request(
        "DELETE",
        `/api/v1/posts/${ids.memberDeniedPost}`,
        ids.platformModeratorMember,
      )
    ).status,
    404,
  );

  assert.equal(
    (await request("GET", "/api/v1/reports", ids.communityModerator)).status,
    403,
  );
  assert.equal(
    (
      await request(
        "DELETE",
        `/api/v1/posts/${ids.communityModeratorPost}`,
        ids.communityModerator,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        "DELETE",
        `/api/v1/comments/${ids.communityModeratorComment}`,
        ids.communityModerator,
      )
    ).status,
    200,
  );

  assert.equal(
    (await request("GET", "/api/v1/reports", ids.dualModerator)).status,
    200,
  );
  assert.equal(
    (
      await request(
        "DELETE",
        `/api/v1/posts/${ids.dualModeratorPost}`,
        ids.dualModerator,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        "DELETE",
        `/api/v1/posts/${ids.globalDeniedPost}`,
        ids.dualModerator,
      )
    ).status,
    404,
  );
  assert.equal(
    (await request("GET", "/api/v1/admin/dashboard", ids.dualModerator)).status,
    403,
  );
  assert.equal(
    (await request("GET", "/api/v1/users", ids.dualModerator)).status,
    403,
  );
});

test("Unavailable Communities revoke scoped content moderation without mutation", async () => {
  for (const pair of [
    { postId: ids.suspendedPost, commentId: ids.suspendedComment },
    {
      postId: ids.deletedCommunityPost,
      commentId: ids.deletedCommunityComment,
    },
  ]) {
    assert.equal(
      (
        await request(
          "DELETE",
          `/api/v1/posts/${pair.postId}`,
          ids.communityModerator,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await request(
          "DELETE",
          `/api/v1/comments/${pair.commentId}`,
          ids.communityModerator,
        )
      ).status,
      404,
    );
    const [post, comment] = await Promise.all([
      prisma.post.findUniqueOrThrow({
        where: { id: pair.postId },
        select: { isDeleted: true },
      }),
      prisma.comment.findUniqueOrThrow({
        where: { id: pair.commentId },
        select: { isDeleted: true },
      }),
    ]);
    assert.equal(post.isDeleted, false);
    assert.equal(comment.isDeleted, false);
  }
});

test("Community ownership grants only scoped authority without a membership row", async () => {
  const ownerCommunityId = (
    await prisma.post.findUniqueOrThrow({
      where: { id: ids.ownerPost },
      select: { communityId: true },
    })
  ).communityId!;
  const membership = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId: ownerCommunityId,
        userId: ids.ownerWithoutMembership,
      },
    },
  });
  assert.equal(membership, null);

  assert.equal(
    (
      await request(
        "DELETE",
        `/api/v1/posts/${ids.ownerPost}`,
        ids.ownerWithoutMembership,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        "DELETE",
        `/api/v1/comments/${ids.ownerComment}`,
        ids.ownerWithoutMembership,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request(
        "DELETE",
        `/api/v1/posts/${ids.globalDeniedPost}`,
        ids.ownerWithoutMembership,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await request(
        "DELETE",
        `/api/v1/comments/${ids.globalDeniedComment}`,
        ids.ownerWithoutMembership,
      )
    ).status,
    404,
  );
  assert.equal(
    (await request("GET", "/api/v1/reports", ids.ownerWithoutMembership))
      .status,
    403,
  );
  assert.equal(
    (
      await request(
        "GET",
        "/api/v1/admin/dashboard",
        ids.ownerWithoutMembership,
      )
    ).status,
    403,
  );
});

test("Community Moderator cannot mutate membership status", async () => {
  assert.equal(
    (
      await request(
        "PATCH",
        `/api/v1/communities/${ids.community}/members/${ids.managedMember}/status`,
        ids.communityModerator,
        { status: CommunityMemberStatus.BANNED },
      )
    ).status,
    404,
  );
});

const assertTargetShape = (report: TReportData) => {
  assert.equal(report.target.type, report.targetType);
  assert.equal(report.target.id, report.targetId);

  if (report.targetType === ReportTargetType.USER) {
    assert.equal(report.target.id, ids.reportTargetUser);
    assert.equal(typeof report.target.name, "string");
    assert.equal(typeof report.target.email, "string");
    assert.equal(typeof report.target.role, "string");
    assert.equal(typeof report.target.status, "string");
    assert.equal(report.target.deletedAt, null);
    return;
  }
  if (report.targetType === ReportTargetType.POST) {
    assert.equal(report.target.id, ids.reportPost);
    assert.equal((report.target.author as TReportUser).id, ids.contentAuthor);
    assert.equal(report.target.communityId, null);
    assert.equal(report.target.excerpt, `${runId} report target post`);
    assert.equal(report.target.visibility, "PUBLIC");
    assert.equal(report.target.isDeleted, false);
    return;
  }
  if (report.targetType === ReportTargetType.COMMENT) {
    assert.equal(report.target.id, ids.reportComment);
    assert.equal((report.target.author as TReportUser).id, ids.contentAuthor);
    assert.equal(report.target.postId, ids.reportPost);
    assert.equal(report.target.excerpt, `${runId} report-target-comment`);
    assert.equal(report.target.isDeleted, false);
    return;
  }

  assert.equal(report.target.id, ids.reportCommunity);
  assert.equal((report.target.owner as TReportUser).id, ids.contentAuthor);
  assert.equal(report.target.name, `${runId} report-target`);
  assert.equal(report.target.slug, `${runId}-report-target`);
  assert.equal(report.target.excerpt, `${runId} report community description`);
  assert.equal(report.target.visibility, "PUBLIC");
  assert.equal(report.target.isSuspended, false);
  assert.equal(report.target.deletedAt, null);
};

const readStoredReport = (targetType: ReportTargetType, id: string) => {
  const args = {
    where: { id },
    select: { status: true, reviewedById: true, reviewedAt: true },
  } as const;
  if (targetType === ReportTargetType.USER) {
    return prisma.userReport.findUniqueOrThrow(args);
  }
  if (targetType === ReportTargetType.POST) {
    return prisma.postReport.findUniqueOrThrow(args);
  }
  if (targetType === ReportTargetType.COMMENT) {
    return prisma.commentReport.findUniqueOrThrow(args);
  }
  return prisma.communityReport.findUniqueOrThrow(args);
};

test("Platform Moderator reviews every Report target through the canonical DTO", async () => {
  for (const targetType of Object.values(ReportTargetType)) {
    const reportId = reportIds[targetType];
    const targetId = reportTargetIds[targetType];
    const list = await request(
      "GET",
      `/api/v1/reports?targetType=${targetType}&limit=50`,
      ids.dualModerator,
    );
    assert.equal(list.status, 200);
    const listed = (list.body as { data: TReportData[] }).data.find(
      (report) => report.id === reportId,
    );
    assert.ok(listed);
    assert.equal(listed.targetType, targetType);
    assert.equal(listed.targetId, targetId);
    assert.equal(listed.status, ReportStatus.PENDING);

    const detail = await request(
      "GET",
      `/api/v1/reports/${reportId}`,
      ids.dualModerator,
    );
    assert.equal(detail.status, 200);
    const report = (detail.body as { data: TReportData }).data;
    assert.equal(report.id, reportId);
    assert.equal(report.targetType, targetType);
    assert.equal(report.targetId, targetId);
    assert.equal(report.reason, ReportReason.SPAM);
    assert.equal(report.details, `${runId} ${targetType.toLowerCase()} report`);
    assert.equal(report.status, ReportStatus.PENDING);
    assert.equal(report.reporter.email, ids.reporterEmail);
    assert.equal(report.reviewedBy, null);
    assert.equal(report.reviewedAt, null);
    assert.equal(typeof report.createdAt, "string");
    assert.equal(typeof report.updatedAt, "string");
    assertTargetShape(report);

    const updated = await request(
      "PATCH",
      `/api/v1/reports/${reportId}/status`,
      ids.dualModerator,
      { status: ReportStatus.REVIEWED },
    );
    assert.equal(updated.status, 200);
    const reviewed = (updated.body as { data: TReportData }).data;
    assert.equal(reviewed.status, ReportStatus.REVIEWED);
    assert.equal(reviewed.reviewedBy?.id, ids.dualModerator);
    assert.equal(reviewed.reviewedBy?.role, UserRole.MODERATOR);
    assert.equal(reviewed.reviewedBy?.email, ids.moderatorEmail);
    assert.ok(reviewed.reviewedAt);

    const stored = await readStoredReport(targetType, reportId);
    assert.equal(stored.status, ReportStatus.REVIEWED);
    assert.equal(stored.reviewedById, ids.dualModerator);
    assert.ok(stored.reviewedAt);
  }
});

test("No Moderation REST namespace is mounted", async () => {
  for (const path of ["/api/v1/moderation", "/api/v1/moderation/reports"]) {
    assert.equal((await request("GET", path, ids.dualModerator)).status, 404);
  }
});
