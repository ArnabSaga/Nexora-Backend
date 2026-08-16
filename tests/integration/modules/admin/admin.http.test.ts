import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  CommunityMemberStatus,
  CommunityVisibility,
  PostVisibility,
  ReportReason,
  ReportStatus,
  UserRole,
  UserStatus,
} from "../../../../src/generated/prisma/client";
import app from "../../../../src/app";
import { prisma } from "../../../../src/app/lib/prisma";
import { AdminService } from "../../../../src/app/module/admin/admin.service";
import { CommunityService } from "../../../../src/app/module/community/community.service";
import AppError from "../../../../src/app/shared/errors/AppError";
import { installAuthSessionStub } from "../../../support/auth/auth-session.stub";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestCommunityWithOwnerMembership } from "../../../support/fixtures/community.fixture";
import { createTestCommunityMember } from "../../../support/fixtures/community-member.fixture";
import { createTestComment } from "../../../support/fixtures/comment.fixture";
import { createTestBookmark } from "../../../support/fixtures/bookmark.fixture";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestPostReaction } from "../../../support/fixtures/reaction.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";
import { createTestPostVote } from "../../../support/fixtures/vote.fixture";
import { startTestServer } from "../../../support/server/test-server";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId)
  throw new Error("TEST_RUN_ID is required; use the integration runner");

const runId = `${testRunId}-admin-http`;
const cleanup = createTestCleanup();
const token = `admin${runId.replace(/[^a-z0-9]/gi, "").slice(-20)}`;
let adminId = "";
let superAdminId = "";
let userId = "";
let moderatorId = "";
let postId = "";
let deletedPostId = "";
let activeCommunityId = "";
let suspendedCommunityId = "";
let deletedCommunityId = "";
let activeCommunitySlug = "";
let communityPostId = "";
let communityPostSearchTerm = "";
let communityHashtagName = "";
let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let restoreAuth: (() => void) | undefined;

const request = async (
  method: string,
  path: string,
  actorId?: string,
  body?: unknown,
) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(actorId && { "x-test-user-id": actorId }),
      ...(body !== undefined && { "content-type": "application/json" }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
};

before(async () => {
  const [admin, superAdmin, user, moderator] = await Promise.all([
    createTestUser({ cleanup, runId, label: "admin" }),
    createTestUser({ cleanup, runId, label: "super-admin" }),
    createTestUser({ cleanup, runId, label: "user" }),
    createTestUser({ cleanup, runId, label: "moderator" }),
  ]);
  adminId = admin.id;
  superAdminId = superAdmin.id;
  userId = user.id;
  moderatorId = moderator.id;
  await Promise.all([
    prisma.user.update({
      where: { id: adminId },
      data: { role: UserRole.ADMIN },
    }),
    prisma.user.update({
      where: { id: superAdminId },
      data: { role: UserRole.SUPER_ADMIN },
    }),
    prisma.user.update({
      where: { id: moderatorId },
      data: { role: UserRole.MODERATOR },
    }),
  ]);

  const post = await createTestPost({
    cleanup,
    runId: `${runId}-post`,
    authorId: userId,
    visibility: PostVisibility.PRIVATE,
    content: `${token} 100% foo_bar slash\\path`,
  });
  postId = post.id;
  const deletedPost = await createTestPost({
    cleanup,
    runId: `${runId}-deleted-post`,
    authorId: userId,
    content: `${token} deleted`,
  });
  deletedPostId = deletedPost.id;
  await prisma.post.update({
    where: { id: deletedPostId },
    data: { isDeleted: true },
  });
  for (const [label, content] of [
    ["percent", "100X"],
    ["underscore", "fooXbar"],
    ["backslash", "slashXpath"],
  ] as const) {
    await createTestPost({
      cleanup,
      runId: `${runId}-${label}`,
      authorId: userId,
      content,
    });
  }

  const active = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: userId,
    label: `${token}-100%-foo_-slash\\`,
    visibility: CommunityVisibility.PUBLIC,
  });
  activeCommunityId = active.id;
  activeCommunitySlug = active.slug;
  communityPostSearchTerm = `${token}communityvisibility`;
  communityHashtagName = `${token.toLowerCase()}visibility`;
  const hashtag = await prisma.hashtag.create({
    data: { name: communityHashtagName },
  });
  cleanup.add(`hashtag:${hashtag.id}`, () =>
    prisma.hashtag.deleteMany({ where: { id: hashtag.id } }),
  );
  const communityPost = await createTestPost({
    cleanup,
    runId: `${runId}-community-post`,
    authorId: userId,
    communityId: activeCommunityId,
    content: communityPostSearchTerm,
  });
  communityPostId = communityPost.id;
  await prisma.postHashtag.create({
    data: { postId: communityPost.id, hashtagId: hashtag.id },
  });
  const suspended = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-suspended`,
    ownerId: userId,
    label: `${token}-suspended`,
    isSuspended: true,
  });
  suspendedCommunityId = suspended.id;
  const deleted = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-deleted`,
    ownerId: userId,
    label: `${token}-deleted`,
    deletedAt: new Date(),
  });
  deletedCommunityId = deleted.id;

  restoreAuth = installAuthSessionStub(`${runId}-session`);
  const server = await startTestServer(app);
  baseUrl = server.baseUrl;
  closeServer = server.close;
});

after(async () => {
  restoreAuth?.();
  await closeServer?.();
  await cleanup.run();
});

test("Admin routes enforce authentication and platform roles", async () => {
  assert.equal((await request("GET", "/api/v1/admin/dashboard")).status, 401);
  assert.equal(
    (await request("GET", "/api/v1/admin/dashboard", userId)).status,
    403,
  );
  assert.equal(
    (await request("GET", "/api/v1/admin/dashboard", moderatorId)).status,
    403,
  );
  assert.equal(
    (await request("GET", "/api/v1/admin/dashboard", adminId)).status,
    200,
  );
  assert.equal(
    (await request("GET", "/api/v1/admin/dashboard", superAdminId)).status,
    200,
  );
});

test("Admin dashboard reports baseline-safe category deltas and partitions", async () => {
  const beforeResult = await request("GET", "/api/v1/admin/dashboard", adminId);
  const active = await createTestUser({
    cleanup,
    runId: `${runId}-dashboard-active`,
    label: "dashboard-active",
  });
  await createTestUser({
    cleanup,
    runId: `${runId}-dashboard-suspended`,
    label: "dashboard-suspended",
    status: UserStatus.SUSPENDED,
  });
  await createTestUser({
    cleanup,
    runId: `${runId}-dashboard-deleted`,
    label: "dashboard-deleted",
    status: UserStatus.DELETED,
    deletedAt: new Date(),
  });
  const activePost = await createTestPost({
    cleanup,
    runId: `${runId}-dashboard-post-active`,
    authorId: active.id,
  });
  const deletedPost = await createTestPost({
    cleanup,
    runId: `${runId}-dashboard-post-deleted`,
    authorId: active.id,
  });
  await prisma.post.update({
    where: { id: deletedPost.id },
    data: { isDeleted: true },
  });
  const dashboardCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-dashboard-community-active`,
    ownerId: active.id,
    label: "active",
  });
  await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-dashboard-community-suspended`,
    ownerId: active.id,
    label: "suspended",
    isSuspended: true,
  });
  await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-dashboard-community-deleted`,
    ownerId: active.id,
    label: "deleted",
    isSuspended: true,
    deletedAt: new Date(),
  });
  const dashboardComment = await createTestComment({
    cleanup,
    runId: `${runId}-dashboard-comment`,
    postId: activePost.id,
    authorId: active.id,
  });
  const statuses = Object.values(ReportStatus);
  const [userReports, postReports, commentReports, communityReports] =
    await Promise.all([
      prisma.userReport.createManyAndReturn({
        data: statuses.map((reportStatus) => ({
          reporterId: adminId,
          reportedUserId: active.id,
          reason: ReportReason.SPAM,
          status: reportStatus,
        })),
        select: { id: true },
      }),
      prisma.postReport.createManyAndReturn({
        data: statuses.map((reportStatus) => ({
          reporterId: adminId,
          postId: activePost.id,
          reason: ReportReason.SPAM,
          status: reportStatus,
        })),
        select: { id: true },
      }),
      prisma.commentReport.createManyAndReturn({
        data: statuses.map((reportStatus) => ({
          reporterId: adminId,
          commentId: dashboardComment.id,
          reason: ReportReason.SPAM,
          status: reportStatus,
        })),
        select: { id: true },
      }),
      prisma.communityReport.createManyAndReturn({
        data: statuses.map((reportStatus) => ({
          reporterId: adminId,
          communityId: dashboardCommunity.id,
          reason: ReportReason.SPAM,
          status: reportStatus,
        })),
        select: { id: true },
      }),
    ]);
  cleanup.add("dashboard-user-reports", () =>
    prisma.userReport.deleteMany({
      where: { id: { in: userReports.map(({ id }) => id) } },
    }),
  );
  cleanup.add("dashboard-post-reports", () =>
    prisma.postReport.deleteMany({
      where: { id: { in: postReports.map(({ id }) => id) } },
    }),
  );
  cleanup.add("dashboard-comment-reports", () =>
    prisma.commentReport.deleteMany({
      where: { id: { in: commentReports.map(({ id }) => id) } },
    }),
  );
  cleanup.add("dashboard-community-reports", () =>
    prisma.communityReport.deleteMany({
      where: { id: { in: communityReports.map(({ id }) => id) } },
    }),
  );

  const afterResult = await request("GET", "/api/v1/admin/dashboard", adminId);
  assert.equal(afterResult.status, 200);
  const beforeData = beforeResult.body.data;
  const afterData = afterResult.body.data;
  assert.equal(afterData.users.active - beforeData.users.active, 1);
  assert.equal(afterData.users.suspended - beforeData.users.suspended, 1);
  assert.equal(afterData.users.deleted - beforeData.users.deleted, 1);
  assert.equal(afterData.posts.active - beforeData.posts.active, 1);
  assert.equal(afterData.posts.deleted - beforeData.posts.deleted, 1);
  assert.equal(afterData.communities.active - beforeData.communities.active, 1);
  assert.equal(
    afterData.communities.suspended - beforeData.communities.suspended,
    1,
  );
  assert.equal(
    afterData.communities.deleted - beforeData.communities.deleted,
    1,
  );
  for (const statusValue of ["pending", "reviewed", "resolved", "rejected"]) {
    assert.equal(
      afterData.reports[statusValue] - beforeData.reports[statusValue],
      4,
    );
  }
  assert.equal(afterData.reports.total - beforeData.reports.total, 16);
  assert.equal(
    afterData.users.total,
    afterData.users.active +
      afterData.users.suspended +
      afterData.users.deleted,
  );
  assert.equal(
    afterData.posts.total,
    afterData.posts.active + afterData.posts.deleted,
  );
  assert.equal(
    afterData.communities.total,
    afterData.communities.active +
      afterData.communities.suspended +
      afterData.communities.deleted,
  );
  assert.equal(
    afterData.reports.total,
    afterData.reports.pending +
      afterData.reports.reviewed +
      afterData.reports.resolved +
      afterData.reports.rejected,
  );
});

test("Admin inventories expose all lifecycle states with strict filters", async () => {
  const posts = await request(
    "GET",
    `/api/v1/admin/posts?searchTerm=${encodeURIComponent(token)}&authorId=${userId}`,
    adminId,
  );
  assert.equal(posts.status, 200);
  assert.ok(posts.body.data.some((item: { id: string }) => item.id === postId));
  assert.ok(
    posts.body.data.some((item: { id: string }) => item.id === deletedPostId),
  );
  const deletedPosts = await request(
    "GET",
    `/api/v1/admin/posts?state=DELETED&authorId=${userId}`,
    adminId,
  );
  assert.ok(
    deletedPosts.body.data.some(
      (item: { id: string; isDeleted: boolean }) =>
        item.id === deletedPostId && item.isDeleted,
    ),
  );
  const missingProfileAuthor = posts.body.data.find(
    (item: { id: string }) => item.id === postId,
  ).author;
  assert.equal(missingProfileAuthor.username, userId);

  for (const [state, id] of [
    ["ACTIVE", activeCommunityId],
    ["SUSPENDED", suspendedCommunityId],
    ["DELETED", deletedCommunityId],
  ] as const) {
    const result = await request(
      "GET",
      `/api/v1/admin/communities?state=${state}&ownerId=${userId}`,
      adminId,
    );
    assert.equal(result.status, 200);
    assert.ok(result.body.data.some((item: { id: string }) => item.id === id));
  }

  const beyond = await request(
    "GET",
    `/api/v1/admin/posts?authorId=${userId}&page=10000&limit=1`,
    adminId,
  );
  assert.deepEqual(beyond.body.data, []);
  assert.equal(beyond.body.meta.page, 10000);
});

test("Admin inventories return exact stored relationship counts", async () => {
  const countedPost = await createTestPost({
    cleanup,
    runId: `${runId}-stored-count-post`,
    authorId: userId,
    content: `${token} stored count post`,
  });
  const parent = await createTestComment({
    cleanup,
    runId: `${runId}-stored-count-parent`,
    postId: countedPost.id,
    authorId: userId,
  });
  await createTestComment({
    cleanup,
    runId: `${runId}-stored-count-reply`,
    postId: countedPost.id,
    authorId: adminId,
    parentCommentId: parent.id,
  });
  await createTestComment({
    cleanup,
    runId: `${runId}-stored-count-deleted`,
    postId: countedPost.id,
    authorId: adminId,
    isDeleted: true,
  });
  await createTestPostReaction({
    cleanup,
    userId: adminId,
    postId: countedPost.id,
  });
  await createTestPostVote({
    cleanup,
    userId: adminId,
    postId: countedPost.id,
  });
  await createTestBookmark({
    cleanup,
    userId: adminId,
    postId: countedPost.id,
  });
  const postReport = await prisma.postReport.create({
    data: {
      reporterId: adminId,
      postId: countedPost.id,
      reason: ReportReason.SPAM,
    },
    select: { id: true },
  });
  cleanup.add(`post-report:${postReport.id}`, () =>
    prisma.postReport.deleteMany({ where: { id: postReport.id } }),
  );

  const postResult = await request(
    "GET",
    `/api/v1/admin/posts?searchTerm=${encodeURIComponent("stored count post")}`,
    adminId,
  );
  const postRow = postResult.body.data.find(
    (item: { id: string }) => item.id === countedPost.id,
  );
  assert.deepEqual(postRow.counts, {
    comments: 3,
    reactions: 1,
    votes: 1,
    bookmarks: 1,
    reports: 1,
  });

  const pendingUser = await createTestUser({
    cleanup,
    runId: `${runId}-stored-count-pending`,
    label: "stored-count-pending",
  });
  const bannedUser = await createTestUser({
    cleanup,
    runId: `${runId}-stored-count-banned`,
    label: "stored-count-banned",
  });
  const countedCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-stored-count-community`,
    ownerId: userId,
    label: "stored-count-community",
  });
  await createTestCommunityMember({
    cleanup,
    communityId: countedCommunity.id,
    userId: pendingUser.id,
    status: CommunityMemberStatus.PENDING,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: countedCommunity.id,
    userId: bannedUser.id,
    status: CommunityMemberStatus.BANNED,
  });
  await createTestPost({
    cleanup,
    runId: `${runId}-stored-count-community-active-post`,
    authorId: userId,
    communityId: countedCommunity.id,
  });
  const countedDeletedPost = await createTestPost({
    cleanup,
    runId: `${runId}-stored-count-community-deleted-post`,
    authorId: userId,
    communityId: countedCommunity.id,
  });
  await prisma.post.update({
    where: { id: countedDeletedPost.id },
    data: { isDeleted: true },
  });
  const communityReport = await prisma.communityReport.create({
    data: {
      reporterId: adminId,
      communityId: countedCommunity.id,
      reason: ReportReason.SPAM,
    },
    select: { id: true },
  });
  cleanup.add(`community-report:${communityReport.id}`, () =>
    prisma.communityReport.deleteMany({ where: { id: communityReport.id } }),
  );

  const communityResult = await request(
    "GET",
    `/api/v1/admin/communities?ownerId=${userId}&limit=50`,
    adminId,
  );
  const communityRow = communityResult.body.data.find(
    (item: { id: string }) => item.id === countedCommunity.id,
  );
  assert.deepEqual(communityRow.counts, {
    members: 3,
    posts: 2,
    reports: 1,
  });
});

test("Admin inventories represent unavailable users independently", async () => {
  const relationTerm = `${token}relationcases`;
  const missingProfileAuthor = await createTestUser({
    cleanup,
    runId: `${runId}-missing-profile-author`,
    label: "missing-profile-author",
  });
  const suspendedAuthor = await createTestUser({
    cleanup,
    runId: `${runId}-suspended-author`,
    label: "suspended-author",
    status: UserStatus.SUSPENDED,
  });
  const statusDeletedAuthor = await createTestUser({
    cleanup,
    runId: `${runId}-status-deleted-author`,
    label: "status-deleted-author",
    status: UserStatus.DELETED,
  });
  const softDeletedAuthor = await createTestUser({
    cleanup,
    runId: `${runId}-soft-deleted-author`,
    label: "soft-deleted-author",
    deletedAt: new Date(),
  });
  const authorCases = [
    { user: missingProfileAuthor, status: UserStatus.ACTIVE, deleted: false },
    { user: suspendedAuthor, status: UserStatus.SUSPENDED, deleted: false },
    { user: statusDeletedAuthor, status: UserStatus.DELETED, deleted: false },
    { user: softDeletedAuthor, status: UserStatus.ACTIVE, deleted: true },
  ];
  const authorPostIds = new Map<string, string>();
  for (const { user } of authorCases) {
    const post = await createTestPost({
      cleanup,
      runId: `${runId}-relation-${user.id}`,
      authorId: user.id,
      content: relationTerm,
    });
    authorPostIds.set(user.id, post.id);
  }

  const posts = await request(
    "GET",
    `/api/v1/admin/posts?searchTerm=${relationTerm}&limit=50`,
    adminId,
  );
  assert.equal(posts.status, 200);
  for (const authorCase of authorCases) {
    const row = posts.body.data.find(
      (item: { id: string }) =>
        item.id === authorPostIds.get(authorCase.user.id),
    );
    assert.ok(row);
    assert.equal(row.author.username, authorCase.user.id);
    assert.equal(row.author.avatar, null);
    assert.equal(row.author.status, authorCase.status);
    assert.equal(Boolean(row.author.deletedAt), authorCase.deleted);
  }

  const missingProfileOwner = await createTestUser({
    cleanup,
    runId: `${runId}-missing-profile-owner`,
    label: "missing-profile-owner",
  });
  const unavailableOwner = await createTestUser({
    cleanup,
    runId: `${runId}-unavailable-owner`,
    label: "unavailable-owner",
    status: UserStatus.SUSPENDED,
  });
  const missingOwnerCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-missing-owner-community`,
    ownerId: missingProfileOwner.id,
    label: "missing-owner-community",
  });
  const unavailableOwnerCommunity =
    await createTestCommunityWithOwnerMembership({
      cleanup,
      runId: `${runId}-unavailable-owner-community`,
      ownerId: unavailableOwner.id,
      label: "unavailable-owner-community",
    });

  for (const [owner, communityId, expectedStatus] of [
    [missingProfileOwner, missingOwnerCommunity.id, UserStatus.ACTIVE],
    [unavailableOwner, unavailableOwnerCommunity.id, UserStatus.SUSPENDED],
  ] as const) {
    const result = await request(
      "GET",
      `/api/v1/admin/communities?ownerId=${owner.id}`,
      adminId,
    );
    const row = result.body.data.find(
      (item: { id: string }) => item.id === communityId,
    );
    assert.ok(row);
    assert.equal(row.owner.username, owner.id);
    assert.equal(row.owner.avatar, null);
    assert.equal(row.owner.status, expectedStatus);
  }
});

test("Admin Post inventory applies each filter independently", async () => {
  const filterTerm = `${token}postfilters`;
  const firstCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-post-filter-first-community`,
    ownerId: userId,
    label: "post-filter-first-community",
  });
  const secondCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-post-filter-second-community`,
    ownerId: adminId,
    label: "post-filter-second-community",
  });
  const activePrivate = await createTestPost({
    cleanup,
    runId: `${runId}-post-filter-active`,
    authorId: userId,
    communityId: firstCommunity.id,
    visibility: PostVisibility.PRIVATE,
    content: filterTerm,
  });
  const deletedPublic = await createTestPost({
    cleanup,
    runId: `${runId}-post-filter-deleted`,
    authorId: adminId,
    communityId: secondCommunity.id,
    visibility: PostVisibility.PUBLIC,
    content: filterTerm,
  });
  await prisma.post.update({
    where: { id: deletedPublic.id },
    data: { isDeleted: true },
  });

  for (const [parameter, value, included, excluded] of [
    ["authorId", userId, activePrivate.id, deletedPublic.id],
    ["communityId", firstCommunity.id, activePrivate.id, deletedPublic.id],
    ["visibility", PostVisibility.PRIVATE, activePrivate.id, deletedPublic.id],
    ["state", "ACTIVE", activePrivate.id, deletedPublic.id],
    ["state", "DELETED", deletedPublic.id, activePrivate.id],
  ] as const) {
    const result = await request(
      "GET",
      `/api/v1/admin/posts?searchTerm=${filterTerm}&${parameter}=${value}`,
      adminId,
    );
    const ids = result.body.data.map((item: { id: string }) => item.id);
    assert.ok(ids.includes(included), `${parameter} should include its match`);
    assert.equal(
      ids.includes(excluded),
      false,
      `${parameter} should exclude its control`,
    );
  }
});

test("Admin Community inventory applies each filter independently", async () => {
  const filterTerm = `${token}communityfilters`;
  const activePrivate = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-${filterTerm}-active`,
    ownerId: userId,
    label: "active-private",
    visibility: CommunityVisibility.PRIVATE,
  });
  const suspendedPublic = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-${filterTerm}-suspended`,
    ownerId: adminId,
    label: "suspended-public",
    visibility: CommunityVisibility.PUBLIC,
    isSuspended: true,
  });
  const deletedRestricted = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-${filterTerm}-deleted`,
    ownerId: superAdminId,
    label: "deleted-restricted",
    visibility: CommunityVisibility.RESTRICTED,
    deletedAt: new Date(),
  });

  for (const [parameter, value, included, excluded] of [
    ["ownerId", userId, activePrivate.id, suspendedPublic.id],
    [
      "visibility",
      CommunityVisibility.PRIVATE,
      activePrivate.id,
      suspendedPublic.id,
    ],
    ["state", "ACTIVE", activePrivate.id, suspendedPublic.id],
    ["state", "SUSPENDED", suspendedPublic.id, activePrivate.id],
    ["state", "DELETED", deletedRestricted.id, activePrivate.id],
  ] as const) {
    const result = await request(
      "GET",
      `/api/v1/admin/communities?searchTerm=${filterTerm}&${parameter}=${value}`,
      adminId,
    );
    const ids = result.body.data.map((item: { id: string }) => item.id);
    assert.ok(ids.includes(included), `${parameter} should include its match`);
    assert.equal(
      ids.includes(excluded),
      false,
      `${parameter} should exclude its control`,
    );
  }
});

test("Admin inventory wildcard searches use literal controls", async () => {
  for (const [term, excluded] of [
    ["100%", "100X"],
    ["foo_", "fooXbar"],
    ["slash\\", "slashXpath"],
  ] as const) {
    const result = await request(
      "GET",
      `/api/v1/admin/posts?searchTerm=${encodeURIComponent(term)}`,
      adminId,
    );
    assert.ok(
      result.body.data.some((item: { id: string }) => item.id === postId),
    );
    assert.equal(
      result.body.data.some(
        (item: { content: string }) => item.content === excluded,
      ),
      false,
    );
  }
});

test("Admin Community inventory wildcard searches use literal controls", async () => {
  for (const [label, term, positiveDescription, negativeDescription] of [
    [
      "percent",
      "100%",
      "Admin 100% literal fixture",
      "Admin 100X literal fixture",
    ],
    [
      "underscore",
      "foo_",
      "Admin foo_bar literal fixture",
      "Admin fooXbar literal fixture",
    ],
    [
      "backslash",
      "slash\\",
      "Admin slash\\path literal fixture",
      "Admin slashXpath literal fixture",
    ],
  ] as const) {
    const positive = await createTestCommunityWithOwnerMembership({
      cleanup,
      runId: `${runId}-community-literal-${label}-positive`,
      ownerId: userId,
      label: "literal-positive",
    });
    const negative = await createTestCommunityWithOwnerMembership({
      cleanup,
      runId: `${runId}-community-literal-${label}-negative`,
      ownerId: userId,
      label: "literal-negative",
    });
    await Promise.all([
      prisma.community.update({
        where: { id: positive.id },
        data: { description: positiveDescription },
      }),
      prisma.community.update({
        where: { id: negative.id },
        data: { description: negativeDescription },
      }),
    ]);

    const result = await request(
      "GET",
      `/api/v1/admin/communities?searchTerm=${encodeURIComponent(term)}&limit=50`,
      adminId,
    );
    const ids = result.body.data.map((item: { id: string }) => item.id);
    assert.ok(ids.includes(positive.id));
    assert.equal(ids.includes(negative.id), false);
  }
});

test("Admin Post inventory ordering and pagination are deterministic", async () => {
  const orderingTerm = `${token}postordering`;
  const tieCreatedAt = new Date("2030-01-01T00:00:00.000Z");
  const newest = await createTestPost({
    cleanup,
    runId: `${runId}-post-order-newest`,
    authorId: userId,
    content: orderingTerm,
    createdAt: new Date("2030-01-02T00:00:00.000Z"),
  });
  const tieA = await createTestPost({
    cleanup,
    runId: `${runId}-post-order-a`,
    authorId: userId,
    content: orderingTerm,
    createdAt: tieCreatedAt,
  });
  const tieB = await createTestPost({
    cleanup,
    runId: `${runId}-post-order-b`,
    authorId: userId,
    content: orderingTerm,
    createdAt: tieCreatedAt,
  });
  const expected = [
    newest.id,
    ...[tieA.id, tieB.id].sort((left, right) =>
      left < right ? 1 : left > right ? -1 : 0,
    ),
  ];
  const [pageOne, pageTwo, beyond] = await Promise.all([
    request(
      "GET",
      `/api/v1/admin/posts?searchTerm=${orderingTerm}&page=1&limit=2`,
      adminId,
    ),
    request(
      "GET",
      `/api/v1/admin/posts?searchTerm=${orderingTerm}&page=2&limit=2`,
      adminId,
    ),
    request(
      "GET",
      `/api/v1/admin/posts?searchTerm=${orderingTerm}&page=3&limit=2`,
      adminId,
    ),
  ]);
  const traversed = [...pageOne.body.data, ...pageTwo.body.data].map(
    (item: { id: string }) => item.id,
  );
  assert.deepEqual(traversed, expected);
  assert.equal(new Set(traversed).size, expected.length);
  assert.deepEqual(beyond.body.data, []);
  assert.deepEqual(pageOne.body.meta, {
    page: 1,
    limit: 2,
    total: 3,
    totalPages: 2,
  });
  assert.equal(pageTwo.body.meta.page, 2);
  assert.equal(beyond.body.meta.page, 3);
  assert.equal(beyond.body.meta.total, 3);
});

test("Admin Community inventory ordering and pagination are deterministic", async () => {
  const orderingTerm = `${token}communityordering`;
  const tieCreatedAt = new Date("2030-02-01T00:00:00.000Z");
  const newest = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-${orderingTerm}-newest`,
    ownerId: userId,
    label: "newest",
    createdAt: new Date("2030-02-02T00:00:00.000Z"),
  });
  const tieA = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-${orderingTerm}-a`,
    ownerId: userId,
    label: "tie-a",
    createdAt: tieCreatedAt,
  });
  const tieB = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-${orderingTerm}-b`,
    ownerId: userId,
    label: "tie-b",
    createdAt: tieCreatedAt,
  });
  const expected = [
    newest.id,
    ...[tieA.id, tieB.id].sort((left, right) =>
      left < right ? 1 : left > right ? -1 : 0,
    ),
  ];
  const [pageOne, pageTwo, beyond] = await Promise.all([
    request(
      "GET",
      `/api/v1/admin/communities?searchTerm=${orderingTerm}&page=1&limit=2`,
      adminId,
    ),
    request(
      "GET",
      `/api/v1/admin/communities?searchTerm=${orderingTerm}&page=2&limit=2`,
      adminId,
    ),
    request(
      "GET",
      `/api/v1/admin/communities?searchTerm=${orderingTerm}&page=3&limit=2`,
      adminId,
    ),
  ]);
  const traversed = [...pageOne.body.data, ...pageTwo.body.data].map(
    (item: { id: string }) => item.id,
  );
  assert.deepEqual(traversed, expected);
  assert.equal(new Set(traversed).size, expected.length);
  assert.deepEqual(beyond.body.data, []);
  assert.deepEqual(pageOne.body.meta, {
    page: 1,
    limit: 2,
    total: 3,
    totalPages: 2,
  });
  assert.equal(pageTwo.body.meta.page, 2);
  assert.equal(beyond.body.meta.page, 3);
  assert.equal(beyond.body.meta.total, 3);
});

test("Community status is reversible, idempotent, and changes public availability", async () => {
  const assertCommunityContentVisible = async (visible: boolean) => {
    const communityPosts = await request(
      "GET",
      `/api/v1/posts/community/${activeCommunityId}`,
    );
    const searchPosts = await request(
      "GET",
      `/api/v1/search/posts?query=${encodeURIComponent(communityPostSearchTerm)}`,
    );
    const hashtagPosts = await request(
      "GET",
      `/api/v1/hashtags/${communityHashtagName}/posts`,
    );
    for (const result of [communityPosts, searchPosts, hashtagPosts]) {
      assert.equal(result.status, 200);
      assert.equal(
        result.body.data.some(
          (item: { id: string }) => item.id === communityPostId,
        ),
        visible,
      );
    }
  };

  await assertCommunityContentVisible(true);
  const before = await prisma.community.findUniqueOrThrow({
    where: { id: activeCommunityId },
    select: { updatedAt: true },
  });
  const noOp = await request(
    "PATCH",
    `/api/v1/admin/communities/${activeCommunityId}/status`,
    adminId,
    { status: "ACTIVE" },
  );
  assert.equal(noOp.status, 200);
  assert.equal(noOp.body.data.updatedAt, before.updatedAt.toISOString());

  const suspended = await request(
    "PATCH",
    `/api/v1/admin/communities/${activeCommunityId}/status`,
    adminId,
    { status: "SUSPENDED" },
  );
  assert.equal(suspended.body.data.status, "SUSPENDED");
  assert.equal(
    (await request("GET", `/api/v1/communities/${activeCommunitySlug}`)).status,
    404,
  );
  await assertCommunityContentVisible(false);

  const restored = await request(
    "PATCH",
    `/api/v1/admin/communities/${activeCommunityId}/status`,
    superAdminId,
    { status: "ACTIVE" },
  );
  assert.equal(restored.body.data.status, "ACTIVE");
  assert.equal(
    (await request("GET", `/api/v1/communities/${activeCommunitySlug}`)).status,
    200,
  );
  await assertCommunityContentVisible(true);
});

test("Concurrent Community suspend and restore requests linearize", async () => {
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-status-contention`,
    ownerId: userId,
    label: "status-contention",
  });
  await createTestPost({
    cleanup,
    runId: `${runId}-status-contention-post`,
    authorId: userId,
    communityId: community.id,
  });
  const membershipsBefore = await prisma.communityMember.findMany({
    where: { communityId: community.id },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const postsBefore = await prisma.post.findMany({
    where: { communityId: community.id },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const [suspend, restore] = await Promise.all([
    AdminService.updateCommunityStatus(community.id, "SUSPENDED"),
    AdminService.updateCommunityStatus(community.id, "ACTIVE"),
  ]);
  assert.equal(suspend.status, "SUSPENDED");
  assert.equal(restore.status, "ACTIVE");
  const final = await prisma.community.findUniqueOrThrow({
    where: { id: community.id },
    select: { isSuspended: true, updatedAt: true, deletedAt: true },
  });
  assert.equal(final.deletedAt, null);
  const finalStatus = final.isSuspended ? "SUSPENDED" : "ACTIVE";
  const matchesSuspend =
    finalStatus === suspend.status &&
    final.updatedAt.getTime() === suspend.updatedAt.getTime();
  const matchesRestore =
    finalStatus === restore.status &&
    final.updatedAt.getTime() === restore.updatedAt.getTime();
  assert.ok(matchesSuspend || matchesRestore);
  assert.deepEqual(
    await prisma.communityMember.findMany({
      where: { communityId: community.id },
      select: { id: true },
      orderBy: { id: "asc" },
    }),
    membershipsBefore,
  );
  assert.deepEqual(
    await prisma.post.findMany({
      where: { communityId: community.id },
      select: { id: true },
      orderBy: { id: "asc" },
    }),
    postsBefore,
  );
});

test("Community status and canonical deletion linearize without post-delete mutation", async () => {
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-race`,
    ownerId: userId,
    label: "status-delete-race",
  });
  const actor = {
    id: adminId,
    role: UserRole.ADMIN,
  } as Express.AuthenticatedUser;
  const [statusResult, deleteResult] = await Promise.allSettled([
    AdminService.updateCommunityStatus(community.id, "SUSPENDED"),
    CommunityService.deleteCommunity(community.id, actor),
  ]);
  assert.equal(deleteResult.status, "fulfilled");
  const final = await prisma.community.findUniqueOrThrow({
    where: { id: community.id },
    select: { isSuspended: true, deletedAt: true },
  });
  assert.ok(final.deletedAt);
  if (statusResult.status === "fulfilled") {
    assert.equal(statusResult.value.status, "SUSPENDED");
    assert.equal(final.isSuspended, true);
  } else {
    assert.ok(statusResult.reason instanceof AppError);
    assert.equal(statusResult.reason.statusCode, 404);
    assert.equal(final.isSuspended, false);
  }
});

test("Duplicate Admin aliases and unsafe queries remain absent", async () => {
  assert.equal(
    (await request("GET", "/api/v1/admin/reports", adminId)).status,
    404,
  );
  assert.equal(
    (await request("GET", "/api/v1/admin/users", adminId)).status,
    404,
  );
  assert.equal(
    (await request("DELETE", `/api/v1/admin/posts/${postId}`, adminId)).status,
    404,
  );
  for (const path of [
    "/api/v1/admin/posts?page=01",
    "/api/v1/admin/posts?limit=1&limit=2",
    "/api/v1/admin/posts?unknown=x",
    "/api/v1/admin/communities?state=UNKNOWN",
  ]) {
    assert.equal((await request("GET", path, adminId)).status, 400, path);
  }
});

test("Canonical administrative domain routes remain authorized", async () => {
  assert.equal((await request("GET", "/api/v1/users", adminId)).status, 200);
  assert.equal(
    (await request("GET", "/api/v1/reports", superAdminId)).status,
    200,
  );

  const post = await createTestPost({
    cleanup,
    runId: `${runId}-canonical-delete-post`,
    authorId: userId,
  });
  assert.equal(
    (await request("DELETE", `/api/v1/posts/${post.id}`, adminId)).status,
    200,
  );

  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-canonical-delete-community`,
    ownerId: userId,
    label: "canonical-delete-community",
  });
  assert.equal(
    (
      await request(
        "DELETE",
        `/api/v1/communities/${community.id}`,
        superAdminId,
      )
    ).status,
    200,
  );
});
