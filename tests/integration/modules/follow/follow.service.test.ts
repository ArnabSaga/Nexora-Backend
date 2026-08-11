import assert from "node:assert/strict";
import { after, test } from "node:test";
import { PostVisibility, UserStatus } from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import { FOLLOW_MAX_PAGE } from "../../../../src/app/module/follow/follow.constant";
import { FollowService } from "../../../../src/app/module/follow/follow.service";
import { PostService } from "../../../../src/app/module/post/services/post.service";
import AppError from "../../../../src/app/shared/errors/AppError";
import { ACTIVE_PUBLIC_USER_WHERE } from "../../../../src/app/shared/policies/user.policy";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestFollow } from "../../../support/fixtures/follow.fixture";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";

const testRunId = process.env.TEST_RUN_ID;

if (!testRunId) {
  throw new Error("TEST_RUN_ID is required; use the integration test runner");
}

const runId = `${testRunId}-follow-service`;
const cleanup = createTestCleanup();
const atMinute = (minute: number) =>
  new Date(Date.UTC(2099, 0, 1, 0, minute));

type TFixtureUser = Awaited<ReturnType<typeof createTestUser>>;

const asRequester = (user: TFixtureUser): Express.AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role: user.role,
  status: user.status,
});

const trackFollowPair = (followerId: string, followingId: string) => {
  cleanup.add(`follow-pair:${followerId}:${followingId}`, () =>
    prisma.follow.deleteMany({ where: { followerId, followingId } }),
  );
};

const createProfile = async (user: TFixtureUser, label: string) => {
  const profile = await prisma.profile.create({
    data: {
      userId: user.id,
      username: `${runId}-${label}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
    },
  });

  cleanup.add(`profile:${profile.id}`, () =>
    prisma.profile.deleteMany({ where: { id: profile.id } }),
  );

  return profile;
};

after(async () => {
  try {
    await cleanup.run();
  } finally {
    await prisma.$disconnect();
  }
});

test("Follow creation is idempotent under sequential and concurrent requests", async () => {
  const requester = await createTestUser({ cleanup, runId, label: "create-requester" });
  const target = await createTestUser({ cleanup, runId, label: "create-target" });
  const actor = asRequester(requester);
  trackFollowPair(requester.id, target.id);

  const first = await FollowService.followUser(target.id, actor);
  const second = await FollowService.followUser(target.id, actor);

  assert.equal(first.statusCode, 201);
  assert.equal(second.statusCode, 200);

  await prisma.follow.deleteMany({
    where: { followerId: requester.id, followingId: target.id },
  });

  const concurrent = await Promise.all([
    FollowService.followUser(target.id, actor),
    FollowService.followUser(target.id, actor),
  ]);
  const count = await prisma.follow.count({
    where: { followerId: requester.id, followingId: target.id },
  });

  assert.equal(count, 1);
  assert.deepEqual(
    concurrent.map((result) => result.statusCode).sort(),
    [200, 201],
  );
});

test("Follow requires an eligible target and rejects self-follow", async () => {
  const requester = await createTestUser({ cleanup, runId, label: "eligibility-requester" });
  const suspended = await createTestUser({
    cleanup,
    runId,
    label: "eligibility-suspended",
    status: UserStatus.SUSPENDED,
  });
  const softDeleted = await createTestUser({
    cleanup,
    runId,
    label: "eligibility-deleted",
    deletedAt: atMinute(1),
  });
  const actor = asRequester(requester);

  await assert.rejects(
    FollowService.followUser(requester.id, actor),
    (error: unknown) =>
      error instanceof Error && error.message === "You cannot follow yourself",
  );
  await assert.rejects(
    FollowService.followUser(suspended.id, actor),
    (error: unknown) => error instanceof Error && error.message === "User not found",
  );
  await assert.rejects(
    FollowService.followUser(softDeleted.id, actor),
    (error: unknown) => error instanceof Error && error.message === "User not found",
  );
});

test("Unfollow is idempotent and independent of target availability", async () => {
  const requester = await createTestUser({ cleanup, runId, label: "delete-requester" });
  const target = await createTestUser({ cleanup, runId, label: "delete-target" });
  const softDeleted = await createTestUser({
    cleanup,
    runId,
    label: "delete-soft-deleted",
    deletedAt: atMinute(2),
  });
  const actor = asRequester(requester);
  await createTestFollow({
    cleanup,
    followerId: requester.id,
    followingId: target.id,
  });

  const existing = await FollowService.unfollowUser(target.id, actor);
  await prisma.user.update({
    where: { id: target.id },
    data: { status: UserStatus.SUSPENDED },
  });
  const suspended = await FollowService.unfollowUser(target.id, actor);
  const deleted = await FollowService.unfollowUser(softDeleted.id, actor);
  const nonexistent = await FollowService.unfollowUser(
    "ck1234567890123456789012",
    actor,
  );

  assert.deepEqual(existing, suspended);
  assert.deepEqual(existing, deleted);
  assert.deepEqual(existing, nonexistent);
  await assert.rejects(
    FollowService.unfollowUser(requester.id, actor),
    (error: unknown) =>
      error instanceof Error && error.message === "You cannot unfollow yourself",
  );
});

test("Follow pagination enforces the service boundary", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "page-owner" });
  const accepted = await FollowService.getFollowers(owner.id, {
    page: FOLLOW_MAX_PAGE,
    limit: 100,
  });

  assert.equal(accepted.meta.page, FOLLOW_MAX_PAGE);
  await assert.rejects(
    FollowService.getFollowers(owner.id, { page: FOLLOW_MAX_PAGE + 1 }),
    (error: unknown) => error instanceof AppError && error.statusCode === 400,
  );
});

test("Followers filter eligibility, paginate, order, and expose filtered counts", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "followers-owner" });
  const activeOld = await createTestUser({ cleanup, runId, label: "followers-old" });
  const activeNew = await createTestUser({ cleanup, runId, label: "followers-new" });
  const suspended = await createTestUser({
    cleanup,
    runId,
    label: "followers-suspended",
    status: UserStatus.SUSPENDED,
  });
  const softDeleted = await createTestUser({
    cleanup,
    runId,
    label: "followers-deleted",
    deletedAt: atMinute(4),
  });
  const activeCountUser = await createTestUser({ cleanup, runId, label: "count-active" });
  const suspendedCountUser = await createTestUser({
    cleanup,
    runId,
    label: "count-suspended",
    status: UserStatus.SUSPENDED,
  });
  const deletedCountUser = await createTestUser({
    cleanup,
    runId,
    label: "count-deleted",
    deletedAt: atMinute(5),
  });

  await createTestFollow({ cleanup, followerId: activeOld.id, followingId: owner.id, createdAt: atMinute(1) });
  await createTestFollow({ cleanup, followerId: activeNew.id, followingId: owner.id, createdAt: atMinute(3) });
  await createTestFollow({ cleanup, followerId: suspended.id, followingId: owner.id, createdAt: atMinute(4) });
  await createTestFollow({ cleanup, followerId: softDeleted.id, followingId: owner.id, createdAt: atMinute(5) });
  await createTestFollow({ cleanup, followerId: activeCountUser.id, followingId: activeNew.id });
  await createTestFollow({ cleanup, followerId: suspendedCountUser.id, followingId: activeNew.id });
  await createTestFollow({ cleanup, followerId: deletedCountUser.id, followingId: activeNew.id });
  await createTestFollow({ cleanup, followerId: activeNew.id, followingId: activeCountUser.id });
  await createTestFollow({ cleanup, followerId: activeNew.id, followingId: suspendedCountUser.id });
  await createTestFollow({ cleanup, followerId: activeNew.id, followingId: deletedCountUser.id });

  const first = await FollowService.getFollowers(owner.id, { page: 1, limit: 1 });
  const second = await FollowService.getFollowers(owner.id, { page: 2, limit: 1 });

  assert.deepEqual(first.data.map((user) => user.id), [activeNew.id]);
  assert.deepEqual(second.data.map((user) => user.id), [activeOld.id]);
  assert.deepEqual(first.meta, { page: 1, limit: 1, total: 2, totalPages: 2 });
  assert.deepEqual(second.meta, { page: 2, limit: 1, total: 2, totalPages: 2 });
  assert.equal(first.data[0].followersCount, 1);
  assert.equal(first.data[0].followingCount, 2);

  await prisma.user.update({
    where: { id: owner.id },
    data: { status: UserStatus.SUSPENDED },
  });
  await assert.rejects(
    FollowService.getFollowers(owner.id, {}),
    (error: unknown) => error instanceof Error && error.message === "User not found",
  );
});

test("Following filters eligibility, paginates, and orders independently", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "following-owner" });
  const activeOld = await createTestUser({ cleanup, runId, label: "following-old" });
  const activeNew = await createTestUser({ cleanup, runId, label: "following-new" });
  const suspended = await createTestUser({
    cleanup,
    runId,
    label: "following-suspended",
    status: UserStatus.SUSPENDED,
  });
  const softDeleted = await createTestUser({
    cleanup,
    runId,
    label: "following-deleted",
    deletedAt: atMinute(14),
  });

  await createTestFollow({ cleanup, followerId: owner.id, followingId: activeOld.id, createdAt: atMinute(11) });
  await createTestFollow({ cleanup, followerId: owner.id, followingId: activeNew.id, createdAt: atMinute(13) });
  await createTestFollow({ cleanup, followerId: owner.id, followingId: suspended.id, createdAt: atMinute(14) });
  await createTestFollow({ cleanup, followerId: owner.id, followingId: softDeleted.id, createdAt: atMinute(15) });

  const first = await FollowService.getFollowing(owner.id, { page: 1, limit: 1 });
  const second = await FollowService.getFollowing(owner.id, { page: 2, limit: 1 });

  assert.deepEqual(first.data.map((user) => user.id), [activeNew.id]);
  assert.deepEqual(second.data.map((user) => user.id), [activeOld.id]);
  assert.deepEqual(first.meta, { page: 1, limit: 1, total: 2, totalPages: 2 });
  assert.deepEqual(second.meta, { page: 2, limit: 1, total: 2, totalPages: 2 });
});

test("Suggestions preserve exact eligibility, ordering, and pagination", async () => {
  const requester = await createTestUser({ cleanup, runId, label: "suggest-requester" });
  const existingEligibleUsers = await prisma.user.findMany({
    where: {
      ...ACTIVE_PUBLIC_USER_WHERE,
      id: {
        not: requester.id,
      },
      followers: {
        none: {
          followerId: requester.id,
        },
      },
      profile: {
        isNot: null,
      },
    },
    select: {
      id: true,
    },
  });

  for (const user of existingEligibleUsers) {
    await createTestFollow({
      cleanup,
      followerId: requester.id,
      followingId: user.id,
    });
  }

  const oldest = await createTestUser({ cleanup, runId, label: "suggest-oldest", createdAt: atMinute(21) });
  const middle = await createTestUser({ cleanup, runId, label: "suggest-middle", createdAt: atMinute(22) });
  const newest = await createTestUser({ cleanup, runId, label: "suggest-newest", createdAt: atMinute(23) });
  const followed = await createTestUser({ cleanup, runId, label: "suggest-followed" });
  const profileless = await createTestUser({ cleanup, runId, label: "suggest-profileless" });
  const suspended = await createTestUser({
    cleanup,
    runId,
    label: "suggest-suspended",
    status: UserStatus.SUSPENDED,
  });
  const softDeleted = await createTestUser({
    cleanup,
    runId,
    label: "suggest-deleted",
    deletedAt: atMinute(24),
  });
  await createProfile(oldest, "oldest");
  await createProfile(middle, "middle");
  await createProfile(newest, "newest");
  await createProfile(followed, "followed");
  await createProfile(suspended, "suspended");
  await createProfile(softDeleted, "deleted");
  await createTestFollow({
    cleanup,
    followerId: requester.id,
    followingId: followed.id,
  });

  const first = await FollowService.getSuggestions(asRequester(requester), { page: 1, limit: 2 });
  const second = await FollowService.getSuggestions(asRequester(requester), { page: 2, limit: 2 });
  const returnedIds = [...first.data, ...second.data].map((user) => user.id);

  assert.deepEqual(first.data.map((user) => user.id), [newest.id, middle.id]);
  assert.deepEqual(second.data.map((user) => user.id), [oldest.id]);
  assert.deepEqual(first.meta, { page: 1, limit: 2, total: 3, totalPages: 2 });
  assert.deepEqual(second.meta, { page: 2, limit: 2, total: 3, totalPages: 2 });
  assert.ok(!returnedIds.includes(requester.id));
  assert.ok(!returnedIds.includes(followed.id));
  assert.ok(!returnedIds.includes(profileless.id));
  assert.ok(!returnedIds.includes(suspended.id));
  assert.ok(!returnedIds.includes(softDeleted.id));
});

test("Follow relationships control FOLLOWERS-only Post visibility", async () => {
  const author = await createTestUser({ cleanup, runId, label: "post-author" });
  const viewer = await createTestUser({ cleanup, runId, label: "post-viewer" });
  const post = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    visibility: PostVisibility.FOLLOWERS,
  });
  const requester = asRequester(viewer);
  trackFollowPair(viewer.id, author.id);

  await assert.rejects(PostService.getById(post.id, requester));
  await FollowService.followUser(author.id, requester);
  assert.equal((await PostService.getById(post.id, requester)).id, post.id);
  await FollowService.unfollowUser(author.id, requester);
  await assert.rejects(PostService.getById(post.id, requester));
});
