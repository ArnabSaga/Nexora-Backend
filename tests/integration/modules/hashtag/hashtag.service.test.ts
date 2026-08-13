import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  CommunityVisibility,
  PostVisibility,
  UserStatus,
} from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import { HashtagService } from "../../../../src/app/module/hashtag/hashtag.service";
import { PostService } from "../../../../src/app/module/post/services/post.service";
import { PostVisibilityService } from "../../../../src/app/module/post/services/post-visibility.service";
import { createPrismaHashtagWriter } from "../../../../src/app/shared/hashtags/hashtag-write.prisma.factory";
import AppError from "../../../../src/app/shared/errors/AppError";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestCommunityWithOwnerMembership } from "../../../support/fixtures/community.fixture";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId)
  throw new Error("TEST_RUN_ID is required; use the integration runner");

const runId = `${testRunId}-hashtag-service`;
const cleanup = createTestCleanup();
const trackedHashtagIds = new Set<string>();
const tag = (label: string) =>
  `h${label}${runId}`
    .replace(/[^A-Za-z0-9_]/g, "")
    .toLowerCase()
    .slice(0, 50);

const trackPostHashtags = async (postId: string) => {
  const rows = await prisma.postHashtag.findMany({
    where: { postId },
    select: { hashtagId: true },
  });
  for (const row of rows) {
    if (trackedHashtagIds.has(row.hashtagId)) continue;
    trackedHashtagIds.add(row.hashtagId);
    cleanup.add(`hashtag:${row.hashtagId}`, () =>
      prisma.hashtag.deleteMany({ where: { id: row.hashtagId } }),
    );
  }
};

const sync = async (postId: string, content: string) => {
  await prisma.$transaction((tx) =>
    createPrismaHashtagWriter(tx).syncPostHashtags(postId, content),
  );
  await trackPostHashtags(postId);
};

type TUser = Awaited<ReturnType<typeof createTestUser>>;
const actor = (user: TUser): Express.AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role: user.role,
  status: user.status,
});

after(async () => {
  try {
    await cleanup.run();
  } finally {
    await prisma.$disconnect();
  }
});

test("Hashtag synchronization keeps links and counters aligned", async () => {
  const author = await createTestUser({ cleanup, runId, label: "sync-author" });
  const post = await createTestPost({ cleanup, runId, authorId: author.id });
  const concurrentTag = tag("concurrent");
  const sharedTag = tag("shared");
  const newTag = tag("new");
  await Promise.all([
    sync(post.id, `#${concurrentTag} #${sharedTag}`),
    sync(post.id, `#${concurrentTag} #${sharedTag}`),
  ]);

  const links = await prisma.postHashtag.findMany({
    where: { postId: post.id },
    include: { hashtag: true },
  });
  assert.equal(links.length, 2);
  assert.deepEqual(
    new Set(links.map((link) => link.hashtag.name)),
    new Set([concurrentTag, sharedTag]),
  );
  assert.equal(
    links.every((link) => link.hashtag.postCount === 1),
    true,
  );

  await sync(post.id, `#${sharedTag} #${newTag}`);
  const counters = await prisma.hashtag.findMany({
    where: { name: { in: [concurrentTag, sharedTag, newTag] } },
    select: { name: true, postCount: true },
  });
  assert.deepEqual(
    new Map(counters.map((item) => [item.name, item.postCount])),
    new Map([
      [concurrentTag, 0],
      [sharedTag, 1],
      [newTag, 1],
    ]),
  );
});

test("Post create, update, repost, and delete use shared Hashtag synchronization", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "post-flow-author",
  });
  const firstTag = tag("postflowfirst");
  const secondTag = tag("postflowsecond");
  const repostTag = tag("postflowrepost");
  const created = await PostService.create(actor(author), {
    content: `#${firstTag}`,
  });
  cleanup.add(`post:${created.id}`, () =>
    prisma.post.deleteMany({ where: { id: created.id } }),
  );
  await trackPostHashtags(created.id);

  const updated = await PostService.update(created.id, actor(author), {
    content: `#${secondTag}`,
  });
  await trackPostHashtags(created.id);
  const repost = await PostService.repost(created.id, actor(author), {
    content: `#${repostTag}`,
  });
  cleanup.add(`post:${repost.id}`, () =>
    prisma.post.deleteMany({ where: { id: repost.id } }),
  );
  await trackPostHashtags(repost.id);

  assert.deepEqual(
    created.hashtags.map((item) => item.name),
    [firstTag],
  );
  assert.deepEqual(
    updated.hashtags.map((item) => item.name),
    [secondTag],
  );
  assert.deepEqual(
    repost.hashtags.map((item) => item.name),
    [repostTag],
  );
  assert.equal(
    repost.hashtags.some((item) => item.name === secondTag),
    false,
  );

  await PostService.delete(created.id, actor(author));
  const second = await prisma.hashtag.findUniqueOrThrow({
    where: { name: secondTag },
  });
  assert.equal(second.postCount, 0);
  assert.equal(
    await prisma.postHashtag.count({
      where: { postId: created.id, hashtagId: second.id },
    }),
    1,
  );
});

test("Post update and soft delete linearize without counting deleted Post hashtags", async () => {
  const author = await createTestUser({ cleanup, runId, label: "race-author" });
  const oldTag = tag("raceold");
  const newTag = tag("racenew");
  const oldContent = `old #${oldTag}`;
  const newContent = `new #${newTag}`;
  const created = await PostService.create(actor(author), {
    content: oldContent,
  });
  cleanup.add(`post:${created.id}`, () =>
    prisma.post.deleteMany({ where: { id: created.id } }),
  );
  await trackPostHashtags(created.id);

  const [updateOutcome, deleteOutcome] = await Promise.allSettled([
    PostService.update(created.id, actor(author), { content: newContent }),
    PostService.delete(created.id, actor(author)),
  ]);
  assert.equal(deleteOutcome.status, "fulfilled");

  const finalPost = await prisma.post.findUniqueOrThrow({
    where: { id: created.id },
    select: { content: true, isDeleted: true },
  });
  assert.equal(finalPost.isDeleted, true);
  const newHashtag = await prisma.hashtag.findUnique({
    where: { name: newTag },
  });

  if (updateOutcome.status === "fulfilled") {
    assert.equal(finalPost.content, newContent);
    assert.ok(newHashtag);
    await trackPostHashtags(created.id);
    assert.equal(newHashtag.postCount, 0);
    assert.equal(
      await prisma.postHashtag.count({
        where: { postId: created.id, hashtagId: newHashtag.id },
      }),
      1,
    );
  } else {
    assert.equal(finalPost.content, oldContent);
    assert.equal(
      updateOutcome.reason instanceof AppError &&
        updateOutcome.reason.statusCode === 404 &&
        updateOutcome.reason.message === "Post not found",
      true,
    );
    assert.equal(newHashtag, null);
  }
});

test("Hashtag synchronization rolls back links and counters with its transaction", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "rollback-author",
  });
  const post = await createTestPost({ cleanup, runId, authorId: author.id });
  const originalTag = tag("rollbackoriginal");
  const replacementTag = tag("rollbackreplacement");
  await sync(post.id, `#${originalTag}`);
  const beforeLinks = await prisma.postHashtag.findMany({
    where: { postId: post.id },
    orderBy: { hashtagId: "asc" },
    select: { hashtagId: true },
  });
  const original = await prisma.hashtag.findUniqueOrThrow({
    where: { name: originalTag },
  });
  const sentinel = new Error("forced hashtag rollback");

  await assert.rejects(
    prisma.$transaction(async (tx) => {
      await createPrismaHashtagWriter(tx).syncPostHashtags(
        post.id,
        `#${replacementTag}`,
      );
      throw sentinel;
    }),
    (error) => error === sentinel,
  );

  assert.deepEqual(
    await prisma.postHashtag.findMany({
      where: { postId: post.id },
      orderBy: { hashtagId: "asc" },
      select: { hashtagId: true },
    }),
    beforeLinks,
  );
  assert.equal(
    (await prisma.hashtag.findUniqueOrThrow({ where: { id: original.id } }))
      .postCount,
    original.postCount,
  );
  assert.equal(
    await prisma.hashtag.findUnique({ where: { name: replacementTag } }),
    null,
  );
});

test("Concurrent exact-link removal decrements only once", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "remove-author",
  });
  const post = await createTestPost({ cleanup, runId, authorId: author.id });
  const removedTag = tag("concurrentremove");
  await sync(post.id, `#${removedTag}`);
  const hashtag = await prisma.hashtag.findUniqueOrThrow({
    where: { name: removedTag },
  });

  await Promise.all([sync(post.id, ""), sync(post.id, "")]);
  assert.equal(
    await prisma.postHashtag.count({
      where: { postId: post.id, hashtagId: hashtag.id },
    }),
    0,
  );
  assert.equal(
    (await prisma.hashtag.findUniqueOrThrow({ where: { id: hashtag.id } }))
      .postCount,
    0,
  );
});

test("Hashtag trending uses public visibility rather than stored counters", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "trend-author",
  });
  const visible = await createTestPost({
    cleanup,
    runId: `${runId}-visible`,
    authorId: author.id,
  });
  const hidden = await createTestPost({
    cleanup,
    runId: `${runId}-hidden`,
    authorId: author.id,
    visibility: PostVisibility.PRIVATE,
  });
  const publicTrend = tag("publictrend");
  const hiddenOnly = tag("hiddenonly");
  await sync(visible.id, `#${publicTrend}`);
  await sync(hidden.id, `#${publicTrend} #${hiddenOnly}`);
  await prisma.hashtag.updateMany({
    where: { name: hiddenOnly },
    data: { postCount: 999 },
  });

  const trending = await HashtagService.getTrending({ limit: 50 });
  assert.equal(
    trending.find((item) => item.name === publicTrend)?.postCount,
    1,
  );
  assert.equal(
    trending.some((item) => item.name === hiddenOnly),
    false,
  );
});

test("Hashtag discovery applies the complete guest-public visibility matrix", async () => {
  const baseline = await prisma.postHashtag.groupBy({
    by: ["hashtagId"],
    where: { post: { is: PostVisibilityService.buildPublicOnlyWhere() } },
    _count: { hashtagId: true },
    orderBy: { _count: { hashtagId: "desc" } },
    take: 1,
  });
  const targetVisibleCount = (baseline[0]?._count.hashtagId ?? 0) + 1;
  const active = await createTestUser({
    cleanup,
    runId,
    label: "matrix-active",
  });
  const suspended = await createTestUser({
    cleanup,
    runId,
    label: "matrix-suspended",
    status: UserStatus.SUSPENDED,
  });
  const deletedAuthor = await createTestUser({
    cleanup,
    runId,
    label: "matrix-deleted-author",
    deletedAt: new Date(),
  });
  const publicCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: active.id,
    label: "matrix-public",
    visibility: CommunityVisibility.PUBLIC,
  });
  const restrictedCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: active.id,
    label: "matrix-restricted",
    visibility: CommunityVisibility.RESTRICTED,
  });
  const privateCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: active.id,
    label: "matrix-private",
    visibility: CommunityVisibility.PRIVATE,
  });
  const suspendedCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: active.id,
    label: "matrix-suspended-community",
    isSuspended: true,
  });
  const deletedCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: active.id,
    label: "matrix-deleted-community",
    deletedAt: new Date(),
  });
  const matrixTag = tag("visibilitymatrix");
  const hiddenOnlyTag = tag("visibilityhiddenonly");
  const inputs = [
    { label: "standalone-public", authorId: active.id, visible: true },
    {
      label: "public-community",
      authorId: active.id,
      communityId: publicCommunity.id,
      visible: true,
    },
    {
      label: "restricted-community",
      authorId: active.id,
      communityId: restrictedCommunity.id,
      visible: true,
    },
    {
      label: "private-post",
      authorId: active.id,
      visibility: PostVisibility.PRIVATE,
    },
    {
      label: "followers-post",
      authorId: active.id,
      visibility: PostVisibility.FOLLOWERS,
    },
    {
      label: "community-only",
      authorId: active.id,
      communityId: publicCommunity.id,
      visibility: PostVisibility.COMMUNITY_ONLY,
    },
    {
      label: "private-community",
      authorId: active.id,
      communityId: privateCommunity.id,
    },
    {
      label: "suspended-community",
      authorId: active.id,
      communityId: suspendedCommunity.id,
    },
    {
      label: "deleted-community",
      authorId: active.id,
      communityId: deletedCommunity.id,
    },
    { label: "suspended-author", authorId: suspended.id },
    { label: "deleted-author", authorId: deletedAuthor.id },
    { label: "deleted-post", authorId: active.id, deleted: true },
  ] as const;
  const expectedIds: string[] = [];

  for (const input of inputs) {
    const post = await createTestPost({
      cleanup,
      runId: `${runId}-${input.label}`,
      authorId: input.authorId,
      visibility: "visibility" in input ? input.visibility : undefined,
      communityId: "communityId" in input ? input.communityId : undefined,
    });
    await sync(post.id, `#${matrixTag} #${hiddenOnlyTag}`);
    if ("deleted" in input && input.deleted) {
      await prisma.post.update({
        where: { id: post.id },
        data: { isDeleted: true },
      });
    }
    if ("visible" in input && input.visible) expectedIds.push(post.id);
  }
  for (let index = expectedIds.length; index < targetVisibleCount; index += 1) {
    const post = await createTestPost({
      cleanup,
      runId: `${runId}-matrix-padding-${index}`,
      authorId: active.id,
    });
    await sync(post.id, `#${matrixTag}`);
    expectedIds.push(post.id);
  }

  const result = await HashtagService.getPostsByHashtag(matrixTag, {
    limit: 50,
  });
  assert.deepEqual(
    new Set(result.data.map((post) => post.id)),
    new Set(expectedIds),
  );
  assert.equal(
    (await HashtagService.getTrending({ limit: 50 })).find(
      (item) => item.name === matrixTag,
    )?.postCount,
    expectedIds.length,
  );

  const hidden = await createTestPost({
    cleanup,
    runId: `${runId}-hidden-only-extra`,
    authorId: active.id,
    visibility: PostVisibility.PRIVATE,
  });
  const trulyHiddenTag = tag("trulyhidden");
  await sync(hidden.id, `#${trulyHiddenTag}`);
  assert.deepEqual(
    (await HashtagService.getPostsByHashtag(trulyHiddenTag, { limit: 10 }))
      .data,
    [],
  );
});

test("Hashtag trending uses database count and hashtag ID ordering", async () => {
  const baseline = await prisma.postHashtag.groupBy({
    by: ["hashtagId"],
    where: { post: { is: PostVisibilityService.buildPublicOnlyWhere() } },
    _count: { hashtagId: true },
    orderBy: { _count: { hashtagId: "desc" } },
    take: 1,
  });
  const targetCount = (baseline[0]?._count.hashtagId ?? 0) + 1;
  const author = await createTestUser({ cleanup, runId, label: "tie-author" });
  const firstTag = tag("trendingtiea");
  const secondTag = tag("trendingtieb");

  for (let index = 0; index < targetCount; index += 1) {
    const post = await createTestPost({
      cleanup,
      runId: `${runId}-tie-${index}`,
      authorId: author.id,
    });
    await sync(post.id, `#${firstTag} #${secondTag}`);
  }
  const identities = await prisma.hashtag.findMany({
    where: { name: { in: [firstTag, secondTag] } },
    orderBy: { id: "asc" },
    select: { id: true, name: true },
  });
  await prisma.hashtag.updateMany({
    where: { name: { in: [firstTag, secondTag] } },
    data: { postCount: 999 },
  });

  const trending = await HashtagService.getTrending({ limit: 50 });
  const controlled = trending.filter((item) =>
    [firstTag, secondTag].includes(item.name),
  );
  assert.deepEqual(
    controlled.map((item) => item.id),
    identities.map((item) => item.id),
  );
  assert.deepEqual(
    controlled.map((item) => item.postCount),
    [targetCount, targetCount],
  );
});

test("Hashtag Post cursor traverses equal timestamps without duplicates or omissions", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "cursor-author",
  });
  const createdAt = new Date("2026-08-13T12:00:00.000Z");
  const posts = await Promise.all(
    ["a", "b", "c"].map((label) =>
      createTestPost({
        cleanup,
        runId: `${runId}-cursor-${label}`,
        authorId: author.id,
        createdAt,
      }),
    ),
  );
  const cursorTag = tag("cursortag");
  for (const post of posts) await sync(post.id, `#${cursorTag}`);

  const expected = await prisma.post.findMany({
    where: { id: { in: posts.map((post) => post.id) } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });
  const actualIds: string[] = [];
  let cursor: string | undefined;
  let hasNextPage = true;
  while (hasNextPage) {
    const page = await HashtagService.getPostsByHashtag(
      cursorTag.toUpperCase(),
      { limit: 1, cursor },
    );
    actualIds.push(...page.data.map((post) => post.id));
    cursor = page.meta.nextCursor ?? undefined;
    hasNextPage = page.meta.hasNextPage;
  }
  const expectedIds = expected.map((post) => post.id);
  assert.deepEqual(actualIds, expectedIds);
  assert.equal(actualIds.length, expectedIds.length);
  assert.equal(new Set(actualIds).size, expectedIds.length);
});

test("Hashtag Post cursor survives deletion of its source Post", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "deleted-cursor-author",
  });
  const cursorTag = tag("deletedcursortag");
  const newer = await createTestPost({
    cleanup,
    runId: `${runId}-deleted-cursor-newer`,
    authorId: author.id,
    createdAt: new Date("2026-08-13T13:00:01.000Z"),
  });
  const older = await createTestPost({
    cleanup,
    runId: `${runId}-deleted-cursor-older`,
    authorId: author.id,
    createdAt: new Date("2026-08-13T13:00:00.000Z"),
  });
  await sync(newer.id, `#${cursorTag}`);
  await sync(older.id, `#${cursorTag}`);
  const first = await HashtagService.getPostsByHashtag(cursorTag, { limit: 1 });
  assert.equal(first.data[0].id, newer.id);
  assert.ok(first.meta.nextCursor);
  await prisma.post.update({
    where: { id: newer.id },
    data: { isDeleted: true },
  });
  const second = await HashtagService.getPostsByHashtag(cursorTag, {
    limit: 1,
    cursor: first.meta.nextCursor!,
  });
  assert.equal(second.data[0].id, older.id);
  assert.deepEqual(second.data[0].viewerState, {
    vote: null,
    bookmarked: false,
  });
});

test("Hashtag reads return empty privacy-safe results and validate service inputs", async () => {
  assert.deepEqual(
    (await HashtagService.getPostsByHashtag("missing_tag", { limit: 10 })).data,
    [],
  );
  await assert.rejects(
    HashtagService.getPostsByHashtag(" invalid ", { limit: 10 }),
    (error: unknown) => error instanceof AppError && error.statusCode === 400,
  );
  await assert.rejects(
    HashtagService.getTrending({ limit: 51 }),
    (error: unknown) => error instanceof AppError && error.statusCode === 400,
  );
});
