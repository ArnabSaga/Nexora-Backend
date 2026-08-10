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
import { createTestComment } from "../../../support/fixtures/comment.fixture";
import { createTestFollow } from "../../../support/fixtures/follow.fixture";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import {
  createTestCommentVote,
  createTestPostVote,
} from "../../../support/fixtures/vote.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";
import { startTestServer } from "../../../support/server/test-server";

const testRunId = process.env.TEST_RUN_ID;

if (!testRunId) {
  throw new Error("TEST_RUN_ID is required; use the integration test runner");
}

const runId = `${testRunId}-vote-http`;
const cleanup = createTestCleanup();

type TFixtureUser = Awaited<ReturnType<typeof createTestUser>>;

const users = {} as Record<
  "author" | "validation" | "visibility" | "deletion" | "limit",
  TFixtureUser
>;
const fixtures = {} as {
  publicPostId: string;
  privatePostId: string;
  commentId: string;
  publicOnlyRepostId: string;
  publicOnlySourceId: string;
};

let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let restoreAuth: (() => void) | undefined;

const request = async ({
  userId,
  method,
  path,
  body,
}: {
  userId?: string;
  method: "GET" | "POST" | "DELETE";
  path: string;
  body?: unknown;
}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(userId ? { "x-test-user-id": userId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return { status: response.status, body: await response.json() };
};

before(async () => {
  users.author = await createTestUser({ cleanup, runId, label: "author" });
  users.validation = await createTestUser({
    cleanup,
    runId,
    label: "validation",
  });
  users.visibility = await createTestUser({
    cleanup,
    runId,
    label: "visibility",
  });
  users.deletion = await createTestUser({ cleanup, runId, label: "deletion" });
  users.limit = await createTestUser({ cleanup, runId, label: "limit" });

  const publicPost = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
  });
  const privatePost = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
    visibility: PostVisibility.PRIVATE,
  });
  const comment = await createTestComment({
    cleanup,
    runId,
    postId: publicPost.id,
    authorId: users.author.id,
  });
  const publicOnlySource = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
  });
  const publicOnlyRepost = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
    repostId: publicOnlySource.id,
  });
  await createTestFollow({
    cleanup,
    followerId: users.visibility.id,
    followingId: users.author.id,
  });
  await prisma.post.update({
    where: { id: publicOnlySource.id },
    data: { visibility: PostVisibility.FOLLOWERS },
  });

  fixtures.publicPostId = publicPost.id;
  fixtures.privatePostId = privatePost.id;
  fixtures.commentId = comment.id;
  fixtures.publicOnlyRepostId = publicOnlyRepost.id;
  fixtures.publicOnlySourceId = publicOnlySource.id;

  restoreAuth = installAuthSessionStub(`${runId}-session`);
  const testServer = await startTestServer(app);
  baseUrl = testServer.baseUrl;
  closeServer = testServer.close;
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

test("HTTP Vote routes return validation, visibility, Comment, and success contracts", async () => {
  const invalid = await request({
    userId: users.validation.id,
    method: "DELETE",
    path: "/api/v1/posts/c1/votes",
  });
  const hidden = await request({
    userId: users.visibility.id,
    method: "POST",
    path: `/api/v1/posts/${fixtures.privatePostId}/votes`,
    body: { voteType: VoteType.UPVOTE },
  });
  const visible = await request({
    userId: users.visibility.id,
    method: "POST",
    path: `/api/v1/posts/${fixtures.publicPostId}/votes`,
    body: { voteType: VoteType.UPVOTE },
  });
  const comment = await request({
    userId: users.visibility.id,
    method: "POST",
    path: `/api/v1/comments/${fixtures.commentId}/votes`,
    body: { voteType: VoteType.DOWNVOTE },
  });
  const invalidType = await request({
    userId: users.validation.id,
    method: "POST",
    path: `/api/v1/posts/${fixtures.publicPostId}/votes`,
    body: { voteType: "NEUTRAL" },
  });
  const unknownField = await request({
    userId: users.validation.id,
    method: "POST",
    path: `/api/v1/comments/${fixtures.commentId}/votes`,
    body: { voteType: VoteType.UPVOTE, extra: true },
  });

  assert.equal(invalid.status, 400);
  assert.equal(hidden.status, 404);
  assert.equal(visible.status, 200);
  assert.equal(visible.body.data.counts.votesCount, 1);
  assert.equal(visible.body.data.counts.voteScore, 1);
  assert.equal(visible.body.data.viewerState.vote, VoteType.UPVOTE);
  assert.equal(comment.status, 200);
  assert.equal(comment.body.data.counts.votes, 1);
  assert.equal(comment.body.data.counts.voteScore, -1);
  assert.equal(invalidType.status, 400);
  assert.equal(unknownField.status, 400);
});

test("HTTP Vote routes require authentication", async () => {
  const post = await request({
    method: "POST",
    path: `/api/v1/posts/${fixtures.publicPostId}/votes`,
    body: { voteType: VoteType.UPVOTE },
  });
  const comment = await request({
    method: "DELETE",
    path: `/api/v1/comments/${fixtures.commentId}/votes`,
  });

  assert.equal(post.status, 401);
  assert.equal(comment.status, 401);
});

test("public-only Post endpoints ignore authenticated original visibility", async () => {
  const publicFeed = await request({
    userId: users.visibility.id,
    method: "GET",
    path: "/api/v1/posts/public-feed?limit=50",
  });
  const userPosts = await request({
    userId: users.visibility.id,
    method: "GET",
    path: `/api/v1/posts/user/${users.author.id}?page=1&limit=50`,
  });
  const feedRepost = publicFeed.body.data.find(
    (post: { id: string }) => post.id === fixtures.publicOnlyRepostId,
  );
  const userRepost = userPosts.body.data.find(
    (post: { id: string }) => post.id === fixtures.publicOnlyRepostId,
  );

  assert.equal(publicFeed.status, 200);
  assert.equal(userPosts.status, 200);
  assert.deepEqual(feedRepost.originalPost, {
    id: fixtures.publicOnlySourceId,
    unavailable: true,
  });
  assert.deepEqual(userRepost.originalPost, {
    id: fixtures.publicOnlySourceId,
    unavailable: true,
  });
});

test("HTTP Vote DELETE responses are identical across target states", async () => {
  const deletedTarget = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
  });

  await createTestPostVote({
    cleanup,
    userId: users.deletion.id,
    postId: deletedTarget.id,
  });
  await prisma.post.delete({ where: { id: deletedTarget.id } });
  await createTestPostVote({
    cleanup,
    userId: users.deletion.id,
    postId: fixtures.publicPostId,
  });

  const paths = [
    `/api/v1/posts/${fixtures.publicPostId}/votes`,
    `/api/v1/posts/${fixtures.privatePostId}/votes`,
    `/api/v1/posts/${deletedTarget.id}/votes`,
    "/api/v1/posts/ck1234567890123456789012/votes",
  ];
  const responses = [];

  for (const path of paths) {
    responses.push(
      await request({ userId: users.deletion.id, method: "DELETE", path }),
    );
  }

  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, responses[0].body);
  }
});

test("HTTP Comment Vote DELETE responses are identical across target states", async () => {
  const missingVoteComment = await createTestComment({
    cleanup,
    runId,
    postId: fixtures.publicPostId,
    authorId: users.author.id,
    label: "missing vote",
  });
  const privateComment = await createTestComment({
    cleanup,
    runId,
    postId: fixtures.privatePostId,
    authorId: users.author.id,
    label: "private",
  });
  const deletedComment = await createTestComment({
    cleanup,
    runId,
    postId: fixtures.publicPostId,
    authorId: users.author.id,
    isDeleted: true,
    label: "deleted",
  });
  await createTestCommentVote({
    cleanup,
    userId: users.deletion.id,
    commentId: fixtures.commentId,
  });

  const paths = [
    `/api/v1/comments/${fixtures.commentId}/votes`,
    `/api/v1/comments/${missingVoteComment.id}/votes`,
    `/api/v1/comments/${privateComment.id}/votes`,
    `/api/v1/comments/${deletedComment.id}/votes`,
    "/api/v1/comments/ck1234567890123456789012/votes",
  ];
  const responses = [];

  for (const path of paths) {
    responses.push(
      await request({ userId: users.deletion.id, method: "DELETE", path }),
    );
  }

  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, responses[0].body);
  }
});

test("HTTP Vote and Reaction mutation limiters use independent stores", async () => {
  const votePath = "/api/v1/posts/ck1234567890123456789012/votes";

  for (let index = 0; index < 120; index += 1) {
    const response = await request({
      userId: users.limit.id,
      method: "DELETE",
      path: votePath,
    });
    assert.equal(response.status, 200, `Vote request ${index + 1} should pass`);
  }

  const blockedVote = await request({
    userId: users.limit.id,
    method: "DELETE",
    path: votePath,
  });
  const reaction = await request({
    userId: users.limit.id,
    method: "DELETE",
    path: "/api/v1/posts/ck1234567890123456789012/reactions",
  });

  assert.equal(blockedVote.status, 429);
  assert.equal(reaction.status, 200);
});
