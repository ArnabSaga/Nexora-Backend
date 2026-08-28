import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PostVisibility } from "../../../../src/generated/prisma/client";
import app from "../../../../src/app";
import { prisma } from "../../../../src/app/lib/prisma";
import { PostVisibilityService } from "../../../../src/app/module/post/services/post-visibility.service";
import { createPrismaHashtagWriter } from "../../../../src/app/shared/hashtags/hashtag-write.prisma.factory";
import { installAuthSessionStub } from "../../../support/auth/auth-session.stub";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";
import { startTestServer } from "../../../support/server/test-server";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId)
  throw new Error("TEST_RUN_ID is required; use the integration runner");

const runId = `${testRunId}-hashtag-http`;
const cleanup = createTestCleanup();
let userId = "";
let postId = "";
let privatePostId = "";
let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let restoreAuth: (() => void) | undefined;
let hashtagName = "";
let visibleHashtagCount = 0;

const request = async (path: string, authenticated = false) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: authenticated ? { "x-test-user-id": userId } : undefined,
  });
  return { status: response.status, body: await response.json() };
};

before(async () => {
  const now = new Date();
  const baseline = await prisma.postHashtag.groupBy({
    by: ["hashtagId"],
    where: {
      post: {
        is: {
          AND: [
            PostVisibilityService.buildPublicOnlyWhere(),
            {
              createdAt: {
                gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                lte: now,
              },
            },
          ],
        },
      },
    },
    _count: { hashtagId: true },
    orderBy: { _count: { hashtagId: "desc" } },
    take: 1,
  });
  visibleHashtagCount = (baseline[0]?._count.hashtagId ?? 0) + 1;
  const user = await createTestUser({ cleanup, runId, label: "http-author" });
  userId = user.id;
  const post = await createTestPost({ cleanup, runId, authorId: user.id });
  postId = post.id;
  const privatePost = await createTestPost({
    cleanup,
    runId: `${runId}-private`,
    authorId: user.id,
    visibility: PostVisibility.PRIVATE,
  });
  privatePostId = privatePost.id;
  hashtagName = `h${runId}httptag`
    .replace(/[^A-Za-z0-9_]/g, "")
    .toLowerCase()
    .slice(0, 50);
  await prisma.$transaction((tx) =>
    createPrismaHashtagWriter(tx).syncPostHashtags(post.id, `#${hashtagName}`),
  );
  for (let index = 1; index < visibleHashtagCount; index += 1) {
    const padding = await createTestPost({
      cleanup,
      runId: `${runId}-padding-${index}`,
      authorId: user.id,
    });
    await prisma.$transaction((tx) =>
      createPrismaHashtagWriter(tx).syncPostHashtags(
        padding.id,
        `#${hashtagName}`,
      ),
    );
  }
  await prisma.$transaction((tx) =>
    createPrismaHashtagWriter(tx).syncPostHashtags(
      privatePost.id,
      `#${hashtagName}`,
    ),
  );
  await prisma.post.update({
    where: { id: post.id },
    data: { createdAt: new Date(Date.now() - 1_000) },
  });
  const hashtag = await prisma.hashtag.findUniqueOrThrow({
    where: { name: hashtagName },
    select: { id: true },
  });
  cleanup.add(`hashtag:${hashtag.id}`, () =>
    prisma.hashtag.deleteMany({ where: { id: hashtag.id } }),
  );
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

test("Hashtag HTTP routes are public, viewerless, strict, and correctly ordered", async () => {
  const [trending, guest, authenticated, invalidTag, invalidQuery] =
    await Promise.all([
      request("/api/v1/hashtags/trending?limit=50"),
      request(`/api/v1/hashtags/${hashtagName.toUpperCase()}/posts?limit=10`),
      request(`/api/v1/hashtags/${hashtagName}/posts?limit=10`, true),
      request(`/api/v1/hashtags/%23${hashtagName}/posts`),
      request("/api/v1/hashtags/trending?cursor=x"),
    ]);

  assert.equal(trending.status, 200);
  const trendingHashtag = trending.body.data.find(
    (item: { name: string }) => item.name === hashtagName,
  );
  assert.equal(trendingHashtag.name, hashtagName);
  assert.equal(trendingHashtag.postCount, visibleHashtagCount);
  assert.equal(guest.status, 200);
  assert.equal(authenticated.status, 200);
  const guestIds = guest.body.data.map((post: { id: string }) => post.id);
  assert.equal(guestIds.includes(postId), true);
  assert.equal(guestIds.includes(privatePostId), false);
  assert.deepEqual(authenticated.body.data, guest.body.data);
  for (const post of guest.body.data) {
    assert.deepEqual(post.viewerState, { vote: null, bookmarked: false });
  }
  assert.equal(invalidTag.status, 400);
  assert.equal(invalidQuery.status, 400);
});
