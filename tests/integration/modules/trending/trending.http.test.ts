import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  PostVisibility,
  VoteType,
} from "../../../../src/generated/prisma/client";
import app from "../../../../src/app";
import { prisma } from "../../../../src/app/lib/prisma";
import { installAuthSessionStub } from "../../../support/auth/auth-session.stub";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";
import { startTestServer } from "../../../support/server/test-server";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId) {
  throw new Error("TEST_RUN_ID is required; use the integration runner");
}

const runId = `${testRunId}-trending-http`;
const cleanup = createTestCleanup();
let viewerId = "";
let recentPostId = "";
let secondRecentPostId = "";
let oldPostId = "";
let privatePostId = "";
let privateOriginalId = "";
let publicRepostId = "";
let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let restoreAuth: (() => void) | undefined;

const request = async (path: string, authenticated = false) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: authenticated ? { "x-test-user-id": viewerId } : undefined,
  });
  return { status: response.status, body: await response.json() };
};

before(async () => {
  const author = await createTestUser({ cleanup, runId, label: "author" });
  const viewer = await createTestUser({ cleanup, runId, label: "viewer" });
  viewerId = viewer.id;

  const recent = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    createdAt: new Date(Date.now() - 60_000),
  });
  recentPostId = recent.id;
  const secondRecent = await createTestPost({
    cleanup,
    runId: `${runId}-second`,
    authorId: author.id,
    createdAt: new Date(Date.now() - 120_000),
  });
  secondRecentPostId = secondRecent.id;
  const old = await createTestPost({
    cleanup,
    runId: `${runId}-old`,
    authorId: author.id,
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  });
  oldPostId = old.id;
  const privatePost = await createTestPost({
    cleanup,
    runId: `${runId}-private`,
    authorId: author.id,
    visibility: PostVisibility.PRIVATE,
  });
  privatePostId = privatePost.id;
  const privateOriginal = await createTestPost({
    cleanup,
    runId: `${runId}-private-original`,
    authorId: viewer.id,
    visibility: PostVisibility.PRIVATE,
    content: `${runId} private original content`,
    createdAt: new Date(Date.now() - 180_000),
  });
  privateOriginalId = privateOriginal.id;
  const publicRepost = await createTestPost({
    cleanup,
    runId: `${runId}-public-repost`,
    authorId: author.id,
    repostId: privateOriginal.id,
    createdAt: new Date(Date.now() - 30_000),
  });
  publicRepostId = publicRepost.id;

  const vote = await prisma.postVote.create({
    data: { userId: viewer.id, postId: recent.id, voteType: VoteType.UPVOTE },
  });
  cleanup.add(`post-vote:${vote.id}`, () =>
    prisma.postVote.deleteMany({ where: { id: vote.id } }),
  );
  const bookmark = await prisma.bookmark.create({
    data: { userId: viewer.id, postId: recent.id },
  });
  cleanup.add(`bookmark:${bookmark.id}`, () =>
    prisma.bookmark.deleteMany({ where: { id: bookmark.id } }),
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

test("Trending Posts keep candidates public while canonical viewer state remains authenticated", async () => {
  const [guest, authenticated] = await Promise.all([
    request("/api/v1/trending/posts?limit=50"),
    request("/api/v1/trending/posts?limit=50", true),
  ]);

  assert.equal(guest.status, 200);
  assert.equal(authenticated.status, 200);
  const guestIds = guest.body.data.map((post: { id: string }) => post.id);
  const authenticatedIds = authenticated.body.data.map(
    (post: { id: string }) => post.id,
  );
  assert.deepEqual(authenticatedIds, guestIds);
  assert.equal(guestIds.includes(recentPostId), true);
  assert.equal(guestIds.includes(secondRecentPostId), true);
  assert.equal(guestIds.includes(oldPostId), false);
  assert.equal(guestIds.includes(privatePostId), false);
  assert.equal(guestIds.includes(privateOriginalId), false);
  assert.equal(guestIds.includes(publicRepostId), true);

  const guestPost = guest.body.data.find(
    (post: { id: string }) => post.id === recentPostId,
  );
  const authenticatedPost = authenticated.body.data.find(
    (post: { id: string }) => post.id === recentPostId,
  );
  assert.deepEqual(guestPost.viewerState, { vote: null, bookmarked: false });
  assert.deepEqual(authenticatedPost.viewerState, {
    vote: VoteType.UPVOTE,
    bookmarked: true,
  });
  const guestRepost = guest.body.data.find(
    (post: { id: string }) => post.id === publicRepostId,
  );
  const authenticatedRepost = authenticated.body.data.find(
    (post: { id: string }) => post.id === publicRepostId,
  );
  assert.deepEqual(guestRepost.originalPost, {
    id: privateOriginalId,
    unavailable: true,
  });
  assert.equal(authenticatedRepost.originalPost.id, privateOriginalId);
  assert.equal(
    authenticatedRepost.originalPost.content,
    `${runId} private original content`,
  );
  assert.equal("unavailable" in authenticatedRepost.originalPost, false);
  assert.equal(guest.body.meta.page, 1);
  assert.equal(guest.body.meta.limit, 50);
  assert.equal(guest.body.meta.total >= 2, true);
});

test("Trending Posts validate strictly and preserve beyond-total metadata", async () => {
  const [beyond, unknown, repeated, noncanonical] = await Promise.all([
    request("/api/v1/trending/posts?page=10000&limit=50"),
    request("/api/v1/trending/posts?unknown=x"),
    request("/api/v1/trending/posts?page=1&page=2"),
    request("/api/v1/trending/posts?page=01"),
  ]);

  assert.equal(beyond.status, 200);
  assert.deepEqual(beyond.body.data, []);
  assert.equal(beyond.body.meta.page, 10000);
  assert.equal(unknown.status, 400);
  assert.equal(repeated.status, 400);
  assert.equal(noncanonical.status, 400);
});

test("Unsupported Trending namespaces remain absent", async () => {
  for (const path of [
    "/api/v1/trending/hashtags",
    "/api/v1/trending/users",
    "/api/v1/trending/communities",
  ]) {
    assert.equal((await request(path)).status, 404, path);
  }
});
