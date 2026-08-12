import assert from "node:assert/strict";
import { after, before, test } from "node:test";
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

const runId = `${testRunId}-bookmark-http`;
const cleanup = createTestCleanup();
type TUser = Awaited<ReturnType<typeof createTestUser>>;
const users = {} as Record<"author" | "viewer" | "limit" | "other", TUser>;
let postId = "";
let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let restoreAuth: (() => void) | undefined;

const request = async ({
  method,
  path,
  userId,
}: {
  method: "GET" | "POST" | "DELETE";
  path: string;
  userId?: string;
}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: userId ? { "x-test-user-id": userId } : undefined,
  });

  return { status: response.status, body: await response.json() };
};

before(async () => {
  users.author = await createTestUser({ cleanup, runId, label: "http-author" });
  users.viewer = await createTestUser({ cleanup, runId, label: "http-viewer" });
  users.limit = await createTestUser({ cleanup, runId, label: "http-limit" });
  users.other = await createTestUser({ cleanup, runId, label: "http-other" });
  const post = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
  });
  postId = post.id;
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

test("Bookmark HTTP routes enforce authentication, validation, and contracts", async () => {
  const unauthenticated = await request({
    method: "GET",
    path: "/api/v1/bookmarks",
  });
  const invalidId = await request({
    method: "POST",
    path: "/api/v1/posts/c1/bookmarks",
    userId: users.viewer.id,
  });
  const invalidQuery = await request({
    method: "GET",
    path: "/api/v1/bookmarks?limit=51&extra=true",
    userId: users.viewer.id,
  });
  const created = await request({
    method: "POST",
    path: `/api/v1/posts/${postId}/bookmarks`,
    userId: users.viewer.id,
  });
  const duplicate = await request({
    method: "POST",
    path: `/api/v1/posts/${postId}/bookmarks`,
    userId: users.viewer.id,
  });
  const list = await request({
    method: "GET",
    path: "/api/v1/bookmarks?limit=1",
    userId: users.viewer.id,
  });
  const removed = await request({
    method: "DELETE",
    path: `/api/v1/posts/${postId}/bookmarks`,
    userId: users.viewer.id,
  });

  assert.equal(unauthenticated.status, 401);
  assert.equal(invalidId.status, 400);
  assert.equal(invalidQuery.status, 400);
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.data, { bookmarked: true });
  assert.equal(duplicate.status, 200);
  assert.deepEqual(duplicate.body.data, { bookmarked: true });
  assert.equal(list.status, 200);
  assert.equal(list.body.data[0].id, postId);
  assert.equal(list.body.data[0].viewerState.bookmarked, true);
  assert.equal(removed.status, 200);
  assert.deepEqual(removed.body.data, { bookmarked: false });
});

test("Bookmark limiter blocks request 121 and leaves other buckets available", async () => {
  const missingId = "ck1234567890123456789012";

  for (let index = 0; index < 120; index += 1) {
    const response = await request({
      method: "DELETE",
      path: `/api/v1/posts/${missingId}/bookmarks`,
      userId: users.limit.id,
    });
    assert.equal(response.status, 200, `Request ${index + 1} should pass`);
  }

  const blocked = await request({
    method: "DELETE",
    path: `/api/v1/posts/${missingId}/bookmarks`,
    userId: users.limit.id,
  });
  const otherUser = await request({
    method: "DELETE",
    path: `/api/v1/posts/${missingId}/bookmarks`,
    userId: users.other.id,
  });
  const reaction = await request({
    method: "DELETE",
    path: `/api/v1/posts/${missingId}/reactions`,
    userId: users.limit.id,
  });
  const vote = await request({
    method: "DELETE",
    path: `/api/v1/posts/${missingId}/votes`,
    userId: users.limit.id,
  });
  const follow = await request({
    method: "DELETE",
    path: `/api/v1/users/${missingId}/follow`,
    userId: users.limit.id,
  });
  const community = await request({
    method: "DELETE",
    path: `/api/v1/communities/${missingId}`,
    userId: users.limit.id,
  });
  const post = await request({
    method: "POST",
    path: `/api/v1/posts/${missingId}/repost`,
    userId: users.limit.id,
  });

  assert.equal(blocked.status, 429);
  assert.equal(otherUser.status, 200);
  assert.equal(reaction.status, 200);
  assert.equal(vote.status, 200);
  assert.equal(follow.status, 200);
  assert.notEqual(community.status, 429);
  assert.notEqual(post.status, 429);
});
