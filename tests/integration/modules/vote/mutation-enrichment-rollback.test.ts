import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  MediaType,
  PostVisibility,
  VoteType,
} from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import { createCommentMutationService } from "../../../../src/app/module/comment/comment.service";
import { createPrismaPostResponseService } from "../../../../src/app/module/post/services/post-response.service";
import { createPostMutationService } from "../../../../src/app/module/post/services/post.service";
import { createVoteMutationService } from "../../../../src/app/module/vote/vote.service";
import type { TVoteReadService } from "../../../../src/app/module/vote/vote-read.factory";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestComment } from "../../../support/fixtures/comment.fixture";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import {
  createTestCommentVote,
  createTestPostVote,
} from "../../../support/fixtures/vote.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";

const testRunId = process.env.TEST_RUN_ID;

if (!testRunId) {
  throw new Error("TEST_RUN_ID is required; use the integration test runner");
}

const runId = `${testRunId}-mutation-rollback`;
const cleanup = createTestCleanup();
const enrichmentError = new Error("Injected enrichment failure");

type TFixtureUser = Awaited<ReturnType<typeof createTestUser>>;

let author: TFixtureUser;
let mentionedUser: TFixtureUser;
let existingPostId: string;
let sourcePostId: string;
let parentCommentId: string;
let existingCommentId: string;

const asRequester = (user: TFixtureUser): Express.AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role: user.role,
  status: user.status,
});

const failingVoteReadService = (): TVoteReadService => ({
  getPostVoteStates: async () => {
    throw enrichmentError;
  },
  getCommentVoteStates: async () => {
    throw enrichmentError;
  },
});

const failingPostResponseService = () => ({
  enrichPost: async () => {
    throw enrichmentError;
  },
  enrichPosts: async () => {
    throw enrichmentError;
  },
});

const fakeMediaService = ({ cleanupFails = false } = {}) => {
  const cleanupCalls: Array<{ publicIds: string[]; operation: string }> = [];
  const cleanupWarnings: unknown[][] = [];

  return {
    cleanupCalls,
    cleanupWarnings,
    service: {
      validatePostMedia: () => [],
      uploadPostMedia: async () => [
        {
          url: "https://example.test/rollback.jpg",
          publicId: `${runId}-rollback-media`,
          resourceType: "image",
          mediaType: MediaType.IMAGE,
        },
      ],
      safeCleanupUploadedAssets: async (
        media: Array<{ publicId: string }>,
        operation: string,
      ) => {
        cleanupCalls.push({
          publicIds: media.map((item) => item.publicId),
          operation,
        });
        if (cleanupFails) {
          cleanupWarnings.push(["Upload asset cleanup failed", { operation }]);
        }
      },
    },
  };
};

before(async () => {
  author = await createTestUser({ cleanup, runId, label: "author" });
  mentionedUser = await createTestUser({
    cleanup,
    runId,
    label: "mentioned",
  });
  const existingPost = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    visibility: PostVisibility.PUBLIC,
  });
  const sourcePost = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
  });
  const parentComment = await createTestComment({
    cleanup,
    runId,
    postId: existingPost.id,
    authorId: author.id,
    label: "parent",
  });
  const existingComment = await createTestComment({
    cleanup,
    runId,
    postId: existingPost.id,
    authorId: author.id,
    label: "existing",
  });

  existingPostId = existingPost.id;
  sourcePostId = sourcePost.id;
  parentCommentId = parentComment.id;
  existingCommentId = existingComment.id;
});

after(async () => {
  try {
    await cleanup.run();
  } finally {
    await prisma.$disconnect();
  }
});

test("Post mutations roll back when response enrichment fails", async () => {
  const media = fakeMediaService({ cleanupFails: true });
  const service = createPostMutationService({
    createPostResponseService: failingPostResponseService,
    mediaService: media.service,
  });
  const requester = asRequester(author);
  const failedHashtagName = `rollback_${runId
    .replace(/[^a-z0-9_]/gi, "_")
    .slice(-20)}`.toLowerCase();
  const createContent = `${runId} failed create #${failedHashtagName}`;
  const updateBefore = await prisma.post.findUniqueOrThrow({
    where: { id: existingPostId },
    select: { content: true, visibility: true },
  });

  await assert.rejects(
    service.create(requester, {
      content: createContent,
      mentionedUserIds: [mentionedUser.id],
    }),
    (error) => error === enrichmentError,
  );
  await assert.rejects(
    service.update(existingPostId, requester, {
      content: `${runId} changed content`,
      visibility: PostVisibility.PRIVATE,
    }),
    enrichmentError,
  );
  await assert.rejects(
    service.repost(sourcePostId, requester, {
      content: `${runId} failed repost`,
    }),
    enrichmentError,
  );

  assert.equal(
    await prisma.post.count({ where: { content: createContent } }),
    0,
  );
  assert.equal(
    await prisma.postMedia.count({
      where: { publicId: `${runId}-rollback-media` },
    }),
    0,
  );
  assert.equal(
    await prisma.postHashtag.count({
      where: { post: { content: createContent } },
    }),
    0,
  );
  assert.equal(
    await prisma.postMention.count({
      where: {
        mentionedUserId: mentionedUser.id,
        post: { content: createContent },
      },
    }),
    0,
  );
  assert.equal(
    await prisma.hashtag.count({ where: { name: failedHashtagName } }),
    0,
  );
  assert.deepEqual(
    await prisma.post.findUniqueOrThrow({
      where: { id: existingPostId },
      select: { content: true, visibility: true },
    }),
    updateBefore,
  );
  assert.equal(
    await prisma.post.count({
      where: {
        authorId: author.id,
        repostId: sourcePostId,
        content: `${runId} failed repost`,
      },
    }),
    0,
  );
  assert.deepEqual(media.cleanupCalls, [
    {
      publicIds: [`${runId}-rollback-media`],
      operation: "create-post-transaction-failed",
    },
  ]);
  assert.equal(media.cleanupWarnings.length, 1);
});

test("successful Post creation commits all rows without compensation", async () => {
  const media = fakeMediaService();
  const service = createPostMutationService({
    createPostResponseService: createPrismaPostResponseService,
    mediaService: media.service,
  });
  const hashtagName = `success_${runId
    .replace(/[^a-z0-9_]/gi, "_")
    .slice(-20)}`.toLowerCase();
  const content = `${runId} successful create #${hashtagName}`;
  const response = await service.create(asRequester(author), {
    content,
    mentionedUserIds: [mentionedUser.id],
  });
  const hashtag = await prisma.hashtag.findUniqueOrThrow({
    where: { name: hashtagName },
  });

  cleanup.add(`hashtag:${hashtag.id}`, () =>
    prisma.hashtag.deleteMany({ where: { id: hashtag.id } }),
  );
  cleanup.add(`post:${response.id}`, () =>
    prisma.post.deleteMany({ where: { id: response.id } }),
  );

  assert.equal(
    await prisma.post.count({ where: { id: response.id, content } }),
    1,
  );
  assert.equal(
    await prisma.postMedia.count({ where: { postId: response.id } }),
    1,
  );
  assert.equal(
    await prisma.postHashtag.count({
      where: { postId: response.id, hashtagId: hashtag.id },
    }),
    1,
  );
  assert.equal(hashtag.postCount, 1);
  assert.equal(
    await prisma.postMention.count({
      where: { postId: response.id, mentionedUserId: mentionedUser.id },
    }),
    1,
  );
  assert.deepEqual(media.cleanupCalls, []);
});

test("Comment mutations roll back when Vote enrichment fails", async () => {
  const service = createCommentMutationService({
    createVoteReadService: failingVoteReadService,
  });
  const requester = asRequester(author);
  const createContent = `${runId} failed comment`;
  const replyContent = `${runId} failed reply`;
  const before = await prisma.comment.findUniqueOrThrow({
    where: { id: existingCommentId },
    select: { content: true, isEdited: true },
  });

  await assert.rejects(
    service.createComment(existingPostId, requester, {
      content: createContent,
    }),
    enrichmentError,
  );
  await assert.rejects(
    service.createReply(parentCommentId, requester, {
      content: replyContent,
    }),
    enrichmentError,
  );
  await assert.rejects(
    service.updateComment(existingCommentId, requester, {
      content: `${runId} changed comment`,
    }),
    enrichmentError,
  );

  assert.equal(
    await prisma.comment.count({
      where: { content: { in: [createContent, replyContent] } },
    }),
    0,
  );
  assert.deepEqual(
    await prisma.comment.findUniqueOrThrow({
      where: { id: existingCommentId },
      select: { content: true, isEdited: true },
    }),
    before,
  );
});

test("Vote inserts and updates roll back when summary enrichment fails", async () => {
  const requester = asRequester(author);
  const service = createVoteMutationService({
    createVoteReadService: failingVoteReadService,
  });

  await assert.rejects(
    service.savePostVote(existingPostId, requester, {
      voteType: VoteType.UPVOTE,
    }),
    enrichmentError,
  );
  await assert.rejects(
    service.saveCommentVote(existingCommentId, requester, {
      voteType: VoteType.UPVOTE,
    }),
    enrichmentError,
  );

  assert.equal(
    await prisma.postVote.count({
      where: { userId: author.id, postId: existingPostId },
    }),
    0,
  );
  assert.equal(
    await prisma.commentVote.count({
      where: { userId: author.id, commentId: existingCommentId },
    }),
    0,
  );

  const existingPostVote = await createTestPostVote({
    cleanup,
    userId: author.id,
    postId: existingPostId,
    voteType: VoteType.UPVOTE,
  });
  const existingCommentVote = await createTestCommentVote({
    cleanup,
    userId: author.id,
    commentId: existingCommentId,
    voteType: VoteType.UPVOTE,
  });

  await assert.rejects(
    service.savePostVote(existingPostId, requester, {
      voteType: VoteType.DOWNVOTE,
    }),
    enrichmentError,
  );
  await assert.rejects(
    service.saveCommentVote(existingCommentId, requester, {
      voteType: VoteType.DOWNVOTE,
    }),
    enrichmentError,
  );

  assert.equal(
    (
      await prisma.postVote.findUniqueOrThrow({
        where: { id: existingPostVote.id },
      })
    ).voteType,
    VoteType.UPVOTE,
  );
  assert.equal(
    (
      await prisma.commentVote.findUniqueOrThrow({
        where: { id: existingCommentVote.id },
      })
    ).voteType,
    VoteType.UPVOTE,
  );
});
