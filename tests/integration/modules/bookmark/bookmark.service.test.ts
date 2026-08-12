import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  CommunityMemberStatus,
  CommunityVisibility,
  PostVisibility,
} from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import { BookmarkService } from "../../../../src/app/module/bookmark/bookmark.service";
import { FeedService } from "../../../../src/app/module/post/services/feed.service";
import { PostService } from "../../../../src/app/module/post/services/post.service";
import { PostVisibilityService } from "../../../../src/app/module/post/services/post-visibility.service";
import AppError from "../../../../src/app/shared/errors/AppError";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestBookmark } from "../../../support/fixtures/bookmark.fixture";
import { createTestCommunityMember } from "../../../support/fixtures/community-member.fixture";
import { createTestCommunityWithOwnerMembership } from "../../../support/fixtures/community.fixture";
import { createTestFollow } from "../../../support/fixtures/follow.fixture";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";

const testRunId = process.env.TEST_RUN_ID;

if (!testRunId) {
  throw new Error("TEST_RUN_ID is required; use the integration runner");
}

const runId = `${testRunId}-bookmark-service`;
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

const trackBookmark = (id: string) =>
  cleanup.add(`bookmark-service:${id}`, () =>
    prisma.bookmark.deleteMany({ where: { id } }),
  );

after(async () => {
  try {
    await cleanup.run();
  } finally {
    await prisma.$disconnect();
  }
});

test("Bookmark save is visible-only, idempotent, and concurrency-safe", async () => {
  const author = await createTestUser({ cleanup, runId, label: "save-author" });
  const viewer = await createTestUser({ cleanup, runId, label: "save-viewer" });
  const visible = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
  });
  const hidden = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    visibility: PostVisibility.PRIVATE,
  });
  const requester = actor(viewer);

  const [first, duplicate] = await Promise.all([
    BookmarkService.saveBookmark(visible.id, requester),
    BookmarkService.saveBookmark(visible.id, requester),
  ]);
  const rows = await prisma.bookmark.findMany({
    where: { userId: viewer.id, postId: visible.id },
  });
  rows.forEach((row) => trackBookmark(row.id));

  assert.deepEqual(
    [first.statusCode, duplicate.statusCode].sort((a, b) => a - b),
    [200, 201],
  );
  assert.equal(rows.length, 1);
  assert.equal(
    (await BookmarkService.saveBookmark(visible.id, requester)).statusCode,
    200,
  );
  await assert.rejects(
    BookmarkService.saveBookmark(hidden.id, requester),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
});

test("Bookmark removal is target-independent and requester-scoped", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "remove-author",
  });
  const owner = await createTestUser({ cleanup, runId, label: "remove-owner" });
  const other = await createTestUser({ cleanup, runId, label: "remove-other" });
  const post = await createTestPost({ cleanup, runId, authorId: author.id });
  const bookmark = await createTestBookmark({
    cleanup,
    userId: owner.id,
    postId: post.id,
  });

  await BookmarkService.removeBookmark(post.id, actor(other));
  assert.equal(await prisma.bookmark.count({ where: { id: bookmark.id } }), 1);

  await prisma.post.update({
    where: { id: post.id },
    data: { isDeleted: true },
  });
  const first = await BookmarkService.removeBookmark(post.id, actor(owner));
  const repeated = await BookmarkService.removeBookmark(post.id, actor(owner));

  assert.deepEqual(first, repeated);
  assert.equal(await prisma.bookmark.count({ where: { id: bookmark.id } }), 0);
});

test("Bookmark saving follows PRIVATE and FOLLOWERS Post visibility", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "scope-author",
  });
  const viewer = await createTestUser({
    cleanup,
    runId,
    label: "scope-viewer",
  });
  const privatePost = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    visibility: PostVisibility.PRIVATE,
  });
  const followersPost = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    visibility: PostVisibility.FOLLOWERS,
  });

  const selfBookmark = await BookmarkService.saveBookmark(
    privatePost.id,
    actor(author),
  );
  const selfRow = await prisma.bookmark.findUniqueOrThrow({
    where: { userId_postId: { userId: author.id, postId: privatePost.id } },
  });
  trackBookmark(selfRow.id);
  assert.equal(selfBookmark.statusCode, 201);

  await assert.rejects(
    BookmarkService.saveBookmark(followersPost.id, actor(viewer)),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
  await createTestFollow({
    cleanup,
    followerId: viewer.id,
    followingId: author.id,
  });
  const followerBookmark = await BookmarkService.saveBookmark(
    followersPost.id,
    actor(viewer),
  );
  const followerRow = await prisma.bookmark.findUniqueOrThrow({
    where: { userId_postId: { userId: viewer.id, postId: followersPost.id } },
  });
  trackBookmark(followerRow.id);
  assert.equal(followerBookmark.statusCode, 201);
});

test("Bookmark cursor orders by save time and survives cursor-row deletion", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "cursor-author",
  });
  const viewer = await createTestUser({
    cleanup,
    runId,
    label: "cursor-viewer",
  });
  const posts = await Promise.all(
    ["oldest", "middle", "newest"].map((label) =>
      createTestPost({
        cleanup,
        runId: `${runId}-${label}`,
        authorId: author.id,
      }),
    ),
  );
  const base = new Date("2026-08-12T12:00:00.000Z").getTime();
  const bookmarks = [];

  for (let index = 0; index < posts.length; index += 1) {
    bookmarks.push(
      await createTestBookmark({
        cleanup,
        userId: viewer.id,
        postId: posts[index].id,
        createdAt: new Date(base + index * 1_000),
      }),
    );
  }

  const first = await BookmarkService.getBookmarks(actor(viewer), { limit: 1 });
  assert.deepEqual(
    first.data.map((post) => post.id),
    [posts[2].id],
  );
  assert.equal(first.meta.hasNextPage, true);
  assert.ok(first.meta.nextCursor);

  await prisma.bookmark.delete({ where: { id: bookmarks[2].id } });
  const second = await BookmarkService.getBookmarks(actor(viewer), {
    limit: 1,
    cursor: first.meta.nextCursor!,
  });
  assert.deepEqual(
    second.data.map((post) => post.id),
    [posts[1].id],
  );

  await assert.rejects(
    BookmarkService.getBookmarks(actor(viewer), { limit: 51 }),
    (error: unknown) => error instanceof AppError && error.statusCode === 400,
  );
});

test("Bookmark cursor uses id DESC without duplicates when save times match", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "cursor-tie-author",
  });
  const viewer = await createTestUser({
    cleanup,
    runId,
    label: "cursor-tie-viewer",
  });
  const posts = await Promise.all(
    ["a", "b", "c"].map((label) =>
      createTestPost({
        cleanup,
        runId: `${runId}-cursor-tie-${label}`,
        authorId: author.id,
      }),
    ),
  );
  const createdAt = new Date("2026-08-12T12:30:00.000Z");

  for (const post of posts) {
    await createTestBookmark({
      cleanup,
      userId: viewer.id,
      postId: post.id,
      createdAt,
    });
  }

  const controlledPostIds = posts.map((post) => post.id);
  const expected = await prisma.bookmark.findMany({
    where: {
      userId: viewer.id,
      postId: { in: controlledPostIds },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { postId: true },
  });
  const actualIds: string[] = [];
  let cursor: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const page = await BookmarkService.getBookmarks(actor(viewer), {
      limit: 1,
      cursor,
    });

    actualIds.push(...page.data.map((post) => post.id));
    cursor = page.meta.nextCursor ?? undefined;
    hasNextPage = page.meta.hasNextPage;
  }

  const expectedIds = expected.map((row) => row.postId);
  assert.deepEqual(actualIds, expectedIds);
  assert.equal(actualIds.length, controlledPostIds.length);
  assert.equal(new Set(actualIds).size, controlledPostIds.length);
});

test("Bookmark list preserves rows while Community visibility changes", async () => {
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "community-owner",
  });
  const viewer = await createTestUser({
    cleanup,
    runId,
    label: "community-viewer",
  });
  const restricted = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "bookmark-restricted",
    visibility: CommunityVisibility.RESTRICTED,
  });
  const privateCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "bookmark-private",
    visibility: CommunityVisibility.PRIVATE,
  });
  const restrictedMember = await createTestCommunityMember({
    cleanup,
    communityId: restricted.id,
    userId: viewer.id,
  });
  const privateMember = await createTestCommunityMember({
    cleanup,
    communityId: privateCommunity.id,
    userId: viewer.id,
  });
  const publicPost = await createTestPost({
    cleanup,
    runId,
    authorId: owner.id,
    communityId: restricted.id,
  });
  const memberPost = await createTestPost({
    cleanup,
    runId,
    authorId: owner.id,
    communityId: restricted.id,
    visibility: PostVisibility.COMMUNITY_ONLY,
  });
  const privatePost = await createTestPost({
    cleanup,
    runId,
    authorId: owner.id,
    communityId: privateCommunity.id,
  });

  for (const post of [publicPost, memberPost, privatePost]) {
    await createTestBookmark({
      cleanup,
      userId: viewer.id,
      postId: post.id,
    });
  }

  await prisma.communityMember.deleteMany({
    where: { id: { in: [restrictedMember.id, privateMember.id] } },
  });
  let list = await BookmarkService.getBookmarks(actor(viewer), { limit: 10 });
  assert.deepEqual(
    list.data.map((post) => post.id),
    [publicPost.id],
  );
  assert.equal(
    await prisma.bookmark.count({
      where: {
        userId: viewer.id,
        postId: { in: [memberPost.id, privatePost.id] },
      },
    }),
    2,
  );

  await createTestCommunityMember({
    cleanup,
    communityId: restricted.id,
    userId: viewer.id,
    status: CommunityMemberStatus.ACTIVE,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: privateCommunity.id,
    userId: viewer.id,
  });
  list = await BookmarkService.getBookmarks(actor(viewer), { limit: 10 });
  assert.deepEqual(
    new Set(list.data.map((post) => post.id)),
    new Set([publicPost.id, memberPost.id, privatePost.id]),
  );

  await prisma.community.update({
    where: { id: restricted.id },
    data: { isSuspended: true },
  });
  list = await BookmarkService.getBookmarks(actor(viewer), { limit: 10 });
  assert.equal(
    list.data.some((post) => post.community?.id === restricted.id),
    false,
  );

  await prisma.community.update({
    where: { id: restricted.id },
    data: { isSuspended: false },
  });
  await prisma.communityMember.updateMany({
    where: { communityId: restricted.id, userId: viewer.id },
    data: { status: CommunityMemberStatus.BANNED },
  });
  list = await BookmarkService.getBookmarks(actor(viewer), { limit: 10 });
  assert.equal(
    list.data.some((post) => post.id === publicPost.id),
    true,
  );
  assert.equal(
    list.data.some((post) => post.id === memberPost.id),
    false,
  );

  await prisma.community.update({
    where: { id: restricted.id },
    data: { deletedAt: new Date() },
  });
  list = await BookmarkService.getBookmarks(actor(viewer), { limit: 10 });
  assert.equal(
    list.data.some((post) => post.community?.id === restricted.id),
    false,
  );
});

test("Bookmark viewer state propagates through every production Post read path", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "state-author",
  });
  const viewer = await createTestUser({
    cleanup,
    runId,
    label: "state-viewer",
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: author.id,
    label: "bookmark-state-community",
  });
  const newestVisible = await prisma.post.findFirst({
    where: PostVisibilityService.buildVisiblePostWhere(actor(viewer)),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { createdAt: true },
  });
  const baseCreatedAt =
    (newestVisible?.createdAt.getTime() ?? Date.now()) + 1_000;
  const detailPost = await createTestPost({
    cleanup,
    runId: `${runId}-state-detail`,
    authorId: author.id,
    createdAt: new Date(baseCreatedAt),
  });
  const ownedPost = await createTestPost({
    cleanup,
    runId: `${runId}-state-owned`,
    authorId: viewer.id,
    createdAt: new Date(baseCreatedAt + 1_000),
  });
  const communityPost = await createTestPost({
    cleanup,
    runId: `${runId}-state-community`,
    authorId: author.id,
    communityId: community.id,
    createdAt: new Date(baseCreatedAt + 2_000),
  });
  const original = await createTestPost({
    cleanup,
    runId: `${runId}-state-original`,
    authorId: author.id,
    createdAt: new Date(baseCreatedAt + 3_000),
  });
  const repost = await createTestPost({
    cleanup,
    runId: `${runId}-state-repost`,
    authorId: viewer.id,
    repostId: original.id,
    createdAt: new Date(baseCreatedAt + 4_000),
  });

  for (const post of [detailPost, ownedPost, communityPost, original]) {
    await createTestBookmark({
      cleanup,
      userId: viewer.id,
      postId: post.id,
    });
  }

  const [
    viewerPost,
    guestPost,
    personalized,
    myPosts,
    communityPosts,
    repostResponse,
    bookmarks,
  ] = await Promise.all([
    PostService.getById(detailPost.id, actor(viewer)),
    PostService.getById(detailPost.id),
    FeedService.getPersonalizedFeed(actor(viewer), { limit: 10 }),
    FeedService.getMyPosts(actor(viewer), { page: 1, limit: 10 }),
    FeedService.getCommunityPosts(
      community.id,
      { page: 1, limit: 10 },
      actor(viewer),
    ),
    PostService.getById(repost.id, actor(viewer)),
    BookmarkService.getBookmarks(actor(viewer), { limit: 10 }),
  ]);

  assert.equal(viewerPost.viewerState.bookmarked, true);
  assert.equal(guestPost.viewerState.bookmarked, false);
  assert.equal(
    personalized.data.find((post) => post.id === detailPost.id)?.viewerState
      .bookmarked,
    true,
  );
  assert.equal(
    myPosts.data.find((post) => post.id === ownedPost.id)?.viewerState
      .bookmarked,
    true,
  );
  assert.equal(
    communityPosts.data.find((post) => post.id === communityPost.id)
      ?.viewerState.bookmarked,
    true,
  );
  assert.ok(
    repostResponse.originalPost &&
      !("unavailable" in repostResponse.originalPost),
  );
  assert.equal(repostResponse.originalPost.viewerState.bookmarked, true);
  assert.equal(
    bookmarks.data.find((post) => post.id === detailPost.id)?.viewerState
      .bookmarked,
    true,
  );
});
