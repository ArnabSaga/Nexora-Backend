import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  PostVisibility,
  ReactionType,
} from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import { ReactionService } from "../../../../src/app/module/reaction/reaction.service";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestComment } from "../../../support/fixtures/comment.fixture";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestPostReaction } from "../../../support/fixtures/reaction.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";

const testRunId = process.env.TEST_RUN_ID;

if (!testRunId) {
  throw new Error("TEST_RUN_ID is required; use the integration test runner");
}

const runId = `${testRunId}-reaction-service`;
const cleanup = createTestCleanup();

type TFixtureUser = Awaited<ReturnType<typeof createTestUser>>;

const users = {} as Record<"author" | "viewer", TFixtureUser>;
const fixtures = {} as {
  privatePostId: string;
  selfPostId: string;
  concurrentPostId: string;
  topCommentId: string;
  replyId: string;
  hiddenReplyId: string;
};

const asRequester = (user: TFixtureUser): Express.AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role: user.role,
  status: user.status,
});

const trackPostReaction = (id: string) => {
  cleanup.add(`post-reaction:${id}`, () =>
    prisma.postReaction.deleteMany({ where: { id } }),
  );
};

const trackCommentReaction = (id: string) => {
  cleanup.add(`comment-reaction:${id}`, () =>
    prisma.commentReaction.deleteMany({ where: { id } }),
  );
};

before(async () => {
  users.author = await createTestUser({ cleanup, runId, label: "author" });
  users.viewer = await createTestUser({ cleanup, runId, label: "viewer" });

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
  const selfPost = await createTestPost({
    cleanup,
    runId,
    authorId: users.viewer.id,
  });
  const concurrentPost = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
  });
  const topComment = await createTestComment({
    cleanup,
    runId,
    postId: publicPost.id,
    authorId: users.author.id,
    label: "top comment",
  });
  const reply = await createTestComment({
    cleanup,
    runId,
    postId: publicPost.id,
    authorId: users.viewer.id,
    parentCommentId: topComment.id,
    label: "reply",
  });
  const deletedParent = await createTestComment({
    cleanup,
    runId,
    postId: publicPost.id,
    authorId: users.author.id,
    isDeleted: true,
    label: "deleted parent",
  });
  const hiddenReply = await createTestComment({
    cleanup,
    runId,
    postId: publicPost.id,
    authorId: users.viewer.id,
    parentCommentId: deletedParent.id,
    label: "hidden reply",
  });

  fixtures.privatePostId = privatePost.id;
  fixtures.selfPostId = selfPost.id;
  fixtures.concurrentPostId = concurrentPost.id;
  fixtures.topCommentId = topComment.id;
  fixtures.replyId = reply.id;
  fixtures.hiddenReplyId = hiddenReply.id;
});

after(async () => {
  try {
    await cleanup.run();
  } finally {
    await prisma.$disconnect();
  }
});

test("service enforces Post and Comment display visibility", async () => {
  const requester = asRequester(users.viewer);
  const postReaction = await ReactionService.savePostReaction(
    fixtures.selfPostId,
    requester,
    { reactionType: ReactionType.LIKE },
  );
  const commentReaction = await ReactionService.saveCommentReaction(
    fixtures.topCommentId,
    requester,
    { reactionType: ReactionType.LOVE },
  );
  const replyReaction = await ReactionService.saveCommentReaction(
    fixtures.replyId,
    requester,
    { reactionType: ReactionType.INSIGHTFUL },
  );

  trackPostReaction(postReaction.id);
  trackCommentReaction(commentReaction.id);
  trackCommentReaction(replyReaction.id);

  await assert.rejects(
    ReactionService.savePostReaction(fixtures.privatePostId, requester, {
      reactionType: ReactionType.LIKE,
    }),
    (error: unknown) =>
      error instanceof Error && error.message === "Post not found",
  );
  await assert.rejects(
    ReactionService.saveCommentReaction(fixtures.hiddenReplyId, requester, {
      reactionType: ReactionType.LIKE,
    }),
    (error: unknown) =>
      error instanceof Error && error.message === "Comment not found",
  );
});

test("concurrent same and contradictory reactions leave exactly one row", async () => {
  const requester = asRequester(users.viewer);

  await prisma.postReaction.deleteMany({
    where: { userId: requester.id, postId: fixtures.concurrentPostId },
  });

  const sameType = await Promise.all([
    ReactionService.savePostReaction(fixtures.concurrentPostId, requester, {
      reactionType: ReactionType.LIKE,
    }),
    ReactionService.savePostReaction(fixtures.concurrentPostId, requester, {
      reactionType: ReactionType.LIKE,
    }),
  ]);
  sameType.forEach((reaction) => trackPostReaction(reaction.id));

  let rows = await prisma.postReaction.findMany({
    where: { userId: requester.id, postId: fixtures.concurrentPostId },
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].reactionType, ReactionType.LIKE);

  await prisma.postReaction.deleteMany({
    where: { userId: requester.id, postId: fixtures.concurrentPostId },
  });

  const contradictory = await Promise.all([
    ReactionService.savePostReaction(fixtures.concurrentPostId, requester, {
      reactionType: ReactionType.LIKE,
    }),
    ReactionService.savePostReaction(fixtures.concurrentPostId, requester, {
      reactionType: ReactionType.LOVE,
    }),
  ]);
  contradictory.forEach((reaction) => trackPostReaction(reaction.id));

  rows = await prisma.postReaction.findMany({
    where: { userId: requester.id, postId: fixtures.concurrentPostId },
  });

  assert.equal(rows.length, 1);
  assert.ok(
    rows[0].reactionType === ReactionType.LIKE ||
      rows[0].reactionType === ReactionType.LOVE,
  );
});

test("reaction updates preserve row identity and removal updates counts", async () => {
  const requester = asRequester(users.viewer);

  await ReactionService.removePostReaction(fixtures.concurrentPostId, requester);
  const like = await ReactionService.savePostReaction(
    fixtures.concurrentPostId,
    requester,
    { reactionType: ReactionType.LIKE },
  );
  const love = await ReactionService.savePostReaction(
    fixtures.concurrentPostId,
    requester,
    { reactionType: ReactionType.LOVE },
  );
  trackPostReaction(like.id);

  assert.equal(love.id, like.id);
  assert.equal(love.createdAt.getTime(), like.createdAt.getTime());

  const beforeDelete = await prisma.post.findUniqueOrThrow({
    where: { id: fixtures.concurrentPostId },
    select: { _count: { select: { reactions: true } } },
  });
  assert.equal(beforeDelete._count.reactions, 1);

  await ReactionService.removePostReaction(fixtures.concurrentPostId, requester);
  await ReactionService.removePostReaction(fixtures.concurrentPostId, requester);

  const afterDelete = await prisma.post.findUniqueOrThrow({
    where: { id: fixtures.concurrentPostId },
    select: { _count: { select: { reactions: true } } },
  });
  assert.equal(afterDelete._count.reactions, 0);

  const finalReaction = await ReactionService.savePostReaction(
    fixtures.concurrentPostId,
    requester,
    { reactionType: ReactionType.LOVE },
  );
  trackPostReaction(finalReaction.id);
  assert.equal(finalReaction.reactionType, ReactionType.LOVE);
});

test("removal remains target-independent after access loss or deletion", async () => {
  const requester = asRequester(users.viewer);
  const deletedTarget = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
  });

  await createTestPostReaction({
    cleanup,
    userId: requester.id,
    postId: fixtures.privatePostId,
  });
  await ReactionService.removePostReaction(fixtures.privatePostId, requester);

  await createTestPostReaction({
    cleanup,
    userId: requester.id,
    postId: deletedTarget.id,
  });
  await prisma.post.delete({ where: { id: deletedTarget.id } });

  await ReactionService.removePostReaction(deletedTarget.id, requester);
  await ReactionService.removePostReaction(
    "ck1234567890123456789012",
    requester,
  );
});
