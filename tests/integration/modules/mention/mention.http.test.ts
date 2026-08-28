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

const runId = `${testRunId}-mention-http`;
const cleanup = createTestCleanup();
let authorId = "";
let mentionedUserId = "";
let parentPostId = "";
let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let restoreAuth: (() => void) | undefined;

const request = async (method: string, path: string, body?: unknown) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-user-id": authorId,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

const requestMultipartPost = async (mentionedUserIds: string[]) => {
  const body = new FormData();
  body.set("content", `${runId} multipart Mention`);
  body.set("mentionedUserIds", JSON.stringify(mentionedUserIds));
  const response = await fetch(`${baseUrl}/api/v1/posts`, {
    method: "POST",
    headers: { "x-test-user-id": authorId },
    body,
  });
  return { status: response.status, body: await response.json() };
};

const trackPost = (id: string) => {
  cleanup.add(`http-post:${id}`, () =>
    prisma.post.deleteMany({ where: { id } }),
  );
  cleanup.add(`http-post-notifications:${id}`, () =>
    prisma.notification.deleteMany({ where: { postId: id } }),
  );
};

const trackComment = (id: string) => {
  cleanup.add(`http-comment:${id}`, () =>
    prisma.comment.deleteMany({ where: { id } }),
  );
  cleanup.add(`http-comment-notifications:${id}`, () =>
    prisma.notification.deleteMany({ where: { commentId: id } }),
  );
};

before(async () => {
  const author = await createTestUser({ cleanup, runId, label: "author" });
  const mentioned = await createTestUser({
    cleanup,
    runId,
    label: "mentioned",
  });
  authorId = author.id;
  mentionedUserId = mentioned.id;
  const parent = await createTestPost({
    cleanup,
    runId,
    authorId,
  });
  parentPostId = parent.id;
  cleanup.add(`http-parent-notifications:${parent.id}`, () =>
    prisma.notification.deleteMany({ where: { postId: parent.id } }),
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

test("Mention HTTP contracts cover Post, Repost, Comment, Reply, and mention-only PATCH", async () => {
  const createdPost = await request("POST", "/api/v1/posts", {
    content: `${runId} created Post`,
    mentionedUserIds: [mentionedUserId, mentionedUserId],
  });
  assert.equal(createdPost.status, 201);
  trackPost(createdPost.body.data.id);
  assert.deepEqual(
    createdPost.body.data.mentions.map(
      (mention: { user: { id: string } }) => mention.user.id,
    ),
    [mentionedUserId],
  );

  const clearedPost = await request(
    "PATCH",
    `/api/v1/posts/${createdPost.body.data.id}`,
    { mentionedUserIds: [] },
  );
  assert.equal(clearedPost.status, 200);
  assert.equal(clearedPost.body.data.isEdited, true);
  assert.deepEqual(clearedPost.body.data.mentions, []);

  const repost = await request("POST", `/api/v1/posts/${parentPostId}/repost`, {
    content: "Repost mention",
    mentionedUserIds: [mentionedUserId],
  });
  assert.equal(repost.status, 201);
  trackPost(repost.body.data.id);
  assert.equal(repost.body.data.mentions[0].user.id, mentionedUserId);

  const comment = await request(
    "POST",
    `/api/v1/posts/${parentPostId}/comments`,
    { content: "Comment mention", mentionedUserIds: [mentionedUserId] },
  );
  assert.equal(comment.status, 201);
  trackComment(comment.body.data.id);
  assert.equal(comment.body.data.mentions[0].user.id, mentionedUserId);

  const reply = await request(
    "POST",
    `/api/v1/comments/${comment.body.data.id}/replies`,
    { content: "Reply mention", mentionedUserIds: [mentionedUserId] },
  );
  assert.equal(reply.status, 201);
  trackComment(reply.body.data.id);
  assert.equal(reply.body.data.mentions[0].user.id, mentionedUserId);

  const clearedComment = await request(
    "PATCH",
    `/api/v1/comments/${comment.body.data.id}`,
    { mentionedUserIds: [] },
  );
  assert.equal(clearedComment.status, 200);
  assert.equal(clearedComment.body.data.isEdited, true);
  assert.deepEqual(clearedComment.body.data.mentions, []);
});

test("Mention HTTP validation preserves the raw 50-user boundary", async () => {
  const tooMany = await request("PATCH", `/api/v1/posts/${parentPostId}`, {
    mentionedUserIds: Array.from({ length: 51 }, () => mentionedUserId),
  });
  const emptyPatch = await request(
    "PATCH",
    `/api/v1/comments/cmissingmention`,
    {},
  );

  assert.equal(tooMany.status, 400);
  assert.equal(emptyPatch.status, 400);
});

test("Post multipart Mention transport preserves duplicates and raw limits", async () => {
  const accepted = await requestMultipartPost([
    mentionedUserId,
    mentionedUserId,
  ]);
  assert.equal(accepted.status, 201);
  trackPost(accepted.body.data.id);
  assert.deepEqual(
    accepted.body.data.mentions.map(
      (mention: { user: { id: string } }) => mention.user.id,
    ),
    [mentionedUserId],
  );

  const rejected = await requestMultipartPost(
    Array.from({ length: 51 }, () => mentionedUserId),
  );
  assert.equal(rejected.status, 400);
});
