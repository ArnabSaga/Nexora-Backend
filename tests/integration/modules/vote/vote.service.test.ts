import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  CommunityVisibility,
  PostVisibility,
  VoteType,
} from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import { CommentService } from "../../../../src/app/module/comment/comment.service";
import { FeedService } from "../../../../src/app/module/post/services/feed.service";
import { PostService } from "../../../../src/app/module/post/services/post.service";
import { VoteReadService } from "../../../../src/app/module/vote/vote-read.service";
import { VoteService } from "../../../../src/app/module/vote/vote.service";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestComment } from "../../../support/fixtures/comment.fixture";
import { createTestCommunity } from "../../../support/fixtures/community.fixture";
import { createTestFollow } from "../../../support/fixtures/follow.fixture";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestPostVote } from "../../../support/fixtures/vote.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";

const testRunId = process.env.TEST_RUN_ID;

if (!testRunId) {
  throw new Error("TEST_RUN_ID is required; use the integration test runner");
}

const runId = `${testRunId}-vote-service`;
const cleanup = createTestCleanup();

type TFixtureUser = Awaited<ReturnType<typeof createTestUser>>;

const users = {} as Record<"author" | "viewer" | "other", TFixtureUser>;
const fixtures = {} as {
  publicPostId: string;
  privatePostId: string;
  selfPostId: string;
  concurrentPostId: string;
  topCommentId: string;
  replyId: string;
  hiddenReplyId: string;
  deletedOriginalId: string;
  repostId: string;
  followerSourceId: string;
  followerRepostId: string;
  changedSourceId: string;
  changedRepostId: string;
  communitySourceId: string;
  communityRepostId: string;
  readCommunityId: string;
  readCommunityPostId: string;
};

const asRequester = (user: TFixtureUser): Express.AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role: user.role,
  status: user.status,
});

const trackPostVote = (id: string) => {
  cleanup.add(`post-vote:${id}`, () =>
    prisma.postVote.deleteMany({ where: { id } }),
  );
};

const trackCommentVote = (id: string) => {
  cleanup.add(`comment-vote:${id}`, () =>
    prisma.commentVote.deleteMany({ where: { id } }),
  );
};

before(async () => {
  users.author = await createTestUser({ cleanup, runId, label: "author" });
  users.viewer = await createTestUser({ cleanup, runId, label: "viewer" });
  users.other = await createTestUser({ cleanup, runId, label: "other" });

  await createTestFollow({
    cleanup,
    followerId: users.other.id,
    followingId: users.author.id,
  });
  await createTestFollow({
    cleanup,
    followerId: users.viewer.id,
    followingId: users.other.id,
  });

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
  const deletedOriginal = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
  });
  const repost = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
    repostId: deletedOriginal.id,
  });
  const followerSource = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
    visibility: PostVisibility.FOLLOWERS,
  });
  const followerRepost = await createTestPost({
    cleanup,
    runId,
    authorId: users.other.id,
    visibility: PostVisibility.FOLLOWERS,
    repostId: followerSource.id,
  });
  const changedSource = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
  });
  const changedRepost = await createTestPost({
    cleanup,
    runId,
    authorId: users.other.id,
    repostId: changedSource.id,
  });
  const restrictedCommunity = await createTestCommunity({
    cleanup,
    runId,
    ownerId: users.author.id,
    label: "restricted-original",
  });
  const communitySource = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
    communityId: restrictedCommunity.id,
  });
  const communityRepost = await createTestPost({
    cleanup,
    runId,
    authorId: users.other.id,
    repostId: communitySource.id,
  });
  const readCommunity = await createTestCommunity({
    cleanup,
    runId,
    ownerId: users.author.id,
    label: "vote-read",
  });
  const readCommunityPost = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
    communityId: readCommunity.id,
  });

  await prisma.post.update({
    where: { id: deletedOriginal.id },
    data: { isDeleted: true },
  });
  await prisma.post.update({
    where: { id: changedSource.id },
    data: { visibility: PostVisibility.FOLLOWERS },
  });
  await prisma.community.update({
    where: { id: restrictedCommunity.id },
    data: {
      visibility: CommunityVisibility.PRIVATE,
      isSuspended: true,
    },
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

  Object.assign(fixtures, {
    publicPostId: publicPost.id,
    privatePostId: privatePost.id,
    selfPostId: selfPost.id,
    concurrentPostId: concurrentPost.id,
    topCommentId: topComment.id,
    replyId: reply.id,
    hiddenReplyId: hiddenReply.id,
    deletedOriginalId: deletedOriginal.id,
    repostId: repost.id,
    followerSourceId: followerSource.id,
    followerRepostId: followerRepost.id,
    changedSourceId: changedSource.id,
    changedRepostId: changedRepost.id,
    communitySourceId: communitySource.id,
    communityRepostId: communityRepost.id,
    readCommunityId: readCommunity.id,
    readCommunityPostId: readCommunityPost.id,
  });
});

after(async () => {
  try {
    await cleanup.run();
  } finally {
    await prisma.$disconnect();
  }
});

test("Vote service enforces visibility and supports Posts, Comments, replies, and self-votes", async () => {
  const requester = asRequester(users.viewer);
  const postVote = await VoteService.savePostVote(
    fixtures.selfPostId,
    requester,
    {
      voteType: VoteType.UPVOTE,
    },
  );
  const commentVote = await VoteService.saveCommentVote(
    fixtures.topCommentId,
    requester,
    { voteType: VoteType.UPVOTE },
  );
  const replyVote = await VoteService.saveCommentVote(
    fixtures.replyId,
    requester,
    { voteType: VoteType.DOWNVOTE },
  );

  trackPostVote(postVote.id);
  trackCommentVote(commentVote.id);
  trackCommentVote(replyVote.id);

  await assert.rejects(
    VoteService.savePostVote(fixtures.privatePostId, requester, {
      voteType: VoteType.UPVOTE,
    }),
    (error: unknown) =>
      error instanceof Error && error.message === "Post not found",
  );
  await assert.rejects(
    VoteService.saveCommentVote(fixtures.hiddenReplyId, requester, {
      voteType: VoteType.UPVOTE,
    }),
    (error: unknown) =>
      error instanceof Error && error.message === "Comment not found",
  );
});

test("Vote reads expose scores and viewer state without changing public-only semantics", async () => {
  const viewer = asRequester(users.viewer);
  const other = asRequester(users.other);
  const viewerVote = await VoteService.savePostVote(
    fixtures.publicPostId,
    viewer,
    { voteType: VoteType.UPVOTE },
  );
  const otherVote = await VoteService.savePostVote(
    fixtures.publicPostId,
    other,
    { voteType: VoteType.DOWNVOTE },
  );
  const viewerCommentVote = await VoteService.saveCommentVote(
    fixtures.topCommentId,
    viewer,
    { voteType: VoteType.UPVOTE },
  );
  const otherCommentVote = await VoteService.saveCommentVote(
    fixtures.topCommentId,
    other,
    { voteType: VoteType.DOWNVOTE },
  );

  trackPostVote(viewerVote.id);
  trackPostVote(otherVote.id);
  trackCommentVote(viewerCommentVote.id);
  trackCommentVote(otherCommentVote.id);

  const viewerPost = await PostService.getById(fixtures.publicPostId, viewer);
  const guestPost = await PostService.getById(fixtures.publicPostId);
  const publicFeed = await FeedService.getPublicFeed({ limit: 50 });
  const publicUserPosts = await FeedService.getUserPosts(users.author.id, {
    page: 1,
    limit: 50,
  });
  const viewerComments = await CommentService.getPostComments(
    fixtures.publicPostId,
    { page: 1, limit: 20 },
    viewer,
  );
  const guestComments = await CommentService.getPostComments(
    fixtures.publicPostId,
    { page: 1, limit: 20 },
  );
  const personalizedFeed = await FeedService.getPersonalizedFeed(viewer, {
    limit: 50,
  });
  const myPosts = await FeedService.getMyPosts(viewer, { page: 1, limit: 50 });
  const communityVote = await VoteService.savePostVote(
    fixtures.readCommunityPostId,
    viewer,
    { voteType: VoteType.UPVOTE },
  );
  trackPostVote(communityVote.id);
  const communityPosts = await FeedService.getCommunityPosts(
    fixtures.readCommunityId,
    { page: 1, limit: 50 },
    viewer,
  );

  assert.equal(viewerPost.counts.votesCount, 2);
  assert.equal(viewerPost.counts.voteScore, 0);
  assert.equal(viewerPost.viewerState.vote, VoteType.UPVOTE);
  assert.equal(guestPost.viewerState.vote, null);
  assert.equal(
    publicFeed.data.find((post) => post.id === fixtures.publicPostId)
      ?.viewerState.vote,
    null,
  );
  assert.equal(
    publicUserPosts.data.find((post) => post.id === fixtures.publicPostId)
      ?.viewerState.vote,
    null,
  );

  const viewerComment = viewerComments.data.find(
    (comment) => comment.id === fixtures.topCommentId,
  )!;
  const guestComment = guestComments.data.find(
    (comment) => comment.id === fixtures.topCommentId,
  )!;

  assert.equal(viewerComment.counts.votes, 2);
  assert.equal(viewerComment.counts.voteScore, 0);
  assert.equal(viewerComment.viewerState.vote, VoteType.UPVOTE);
  assert.equal(guestComment.viewerState.vote, null);
  assert.equal(
    viewerComment.replies.find((reply) => reply.id === fixtures.replyId)
      ?.viewerState.vote,
    VoteType.DOWNVOTE,
  );
  assert.equal(
    personalizedFeed.data.find((post) => post.id === fixtures.publicPostId)
      ?.viewerState.vote,
    VoteType.UPVOTE,
  );
  assert.equal(
    myPosts.data.find((post) => post.id === fixtures.selfPostId)?.viewerState
      .vote,
    VoteType.UPVOTE,
  );
  assert.equal(
    communityPosts.data.find((post) => post.id === fixtures.readCommunityPostId)
      ?.viewerState.vote,
    VoteType.UPVOTE,
  );
});

test("repost originals independently enforce follower and current visibility", async () => {
  const reposter = asRequester(users.other);
  const unrelatedFollower = asRequester(users.viewer);
  const sourceVote = await VoteService.savePostVote(
    fixtures.followerSourceId,
    reposter,
    { voteType: VoteType.UPVOTE },
  );
  trackPostVote(sourceVote.id);

  const authorized = await PostService.getById(
    fixtures.followerRepostId,
    reposter,
  );
  const unauthorized = await PostService.getById(
    fixtures.followerRepostId,
    unrelatedFollower,
  );

  assert.equal(authorized.originalPost?.id, fixtures.followerSourceId);
  assert.ok(
    authorized.originalPost && !("unavailable" in authorized.originalPost),
  );
  if (authorized.originalPost && !("unavailable" in authorized.originalPost)) {
    assert.equal(authorized.originalPost.viewerState.vote, VoteType.UPVOTE);
  }
  assert.deepEqual(unauthorized.originalPost, {
    id: fixtures.followerSourceId,
    unavailable: true,
  });
});

test("public-only reads tombstone originals that require viewer privileges", async () => {
  const publicFeed = await FeedService.getPublicFeed({ limit: 50 });
  const userPosts = await FeedService.getUserPosts(users.other.id, {
    page: 1,
    limit: 50,
  });
  const feedRepost = publicFeed.data.find(
    (post) => post.id === fixtures.changedRepostId,
  );
  const userRepost = userPosts.data.find(
    (post) => post.id === fixtures.changedRepostId,
  );
  const communityRepost = publicFeed.data.find(
    (post) => post.id === fixtures.communityRepostId,
  );

  assert.deepEqual(feedRepost?.originalPost, {
    id: fixtures.changedSourceId,
    unavailable: true,
  });
  assert.deepEqual(userRepost?.originalPost, {
    id: fixtures.changedSourceId,
    unavailable: true,
  });
  assert.deepEqual(communityRepost?.originalPost, {
    id: fixtures.communitySourceId,
    unavailable: true,
  });
});

test("concurrent writes keep one Vote row and switching preserves identity", async () => {
  const requester = asRequester(users.viewer);

  await prisma.postVote.deleteMany({
    where: { userId: requester.id, postId: fixtures.concurrentPostId },
  });

  const same = await Promise.all([
    VoteService.savePostVote(fixtures.concurrentPostId, requester, {
      voteType: VoteType.UPVOTE,
    }),
    VoteService.savePostVote(fixtures.concurrentPostId, requester, {
      voteType: VoteType.UPVOTE,
    }),
  ]);
  same.forEach((vote) => trackPostVote(vote.id));

  let rows = await prisma.postVote.findMany({
    where: { userId: requester.id, postId: fixtures.concurrentPostId },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].voteType, VoteType.UPVOTE);

  const changed = await VoteService.savePostVote(
    fixtures.concurrentPostId,
    requester,
    { voteType: VoteType.DOWNVOTE },
  );
  trackPostVote(changed.id);
  assert.equal(changed.id, same[0].id);
  assert.equal(changed.createdAt.getTime(), same[0].createdAt.getTime());

  await prisma.postVote.deleteMany({
    where: { userId: requester.id, postId: fixtures.concurrentPostId },
  });

  const contradictory = await Promise.all([
    VoteService.savePostVote(fixtures.concurrentPostId, requester, {
      voteType: VoteType.UPVOTE,
    }),
    VoteService.savePostVote(fixtures.concurrentPostId, requester, {
      voteType: VoteType.DOWNVOTE,
    }),
  ]);
  contradictory.forEach((vote) => trackPostVote(vote.id));

  rows = await prisma.postVote.findMany({
    where: { userId: requester.id, postId: fixtures.concurrentPostId },
  });
  assert.equal(rows.length, 1);
  assert.ok(
    rows[0].voteType === VoteType.UPVOTE ||
      rows[0].voteType === VoteType.DOWNVOTE,
  );
});

test("empty reads query nothing and deleted original Posts remain tombstones", async () => {
  const emptyPosts = await VoteReadService.getPostVoteStates(
    [],
    users.viewer.id,
  );
  const emptyComments = await VoteReadService.getCommentVoteStates(
    [],
    users.viewer.id,
  );
  const repost = await PostService.getById(
    fixtures.repostId,
    asRequester(users.viewer),
  );

  assert.equal(emptyPosts.size, 0);
  assert.equal(emptyComments.size, 0);
  assert.deepEqual(repost.originalPost, {
    id: fixtures.deletedOriginalId,
    unavailable: true,
  });
});

test("Vote removal remains idempotent and target-independent", async () => {
  const requester = asRequester(users.viewer);
  const deletedTarget = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
  });

  await createTestPostVote({
    cleanup,
    userId: requester.id,
    postId: fixtures.privatePostId,
  });
  await VoteService.removePostVote(fixtures.privatePostId, requester);

  await createTestPostVote({
    cleanup,
    userId: requester.id,
    postId: deletedTarget.id,
  });
  await prisma.post.delete({ where: { id: deletedTarget.id } });

  await VoteService.removePostVote(deletedTarget.id, requester);
  await VoteService.removePostVote(deletedTarget.id, requester);
  await VoteService.removePostVote("ck1234567890123456789012", requester);
});

test("Vote score transitions remain correct across remove and recreate", async () => {
  const requester = asRequester(users.viewer);
  const post = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
  });
  const upvote = await VoteService.savePostVote(post.id, requester, {
    voteType: VoteType.UPVOTE,
  });
  trackPostVote(upvote.id);
  assert.equal(upvote.counts.voteScore, 1);

  await VoteService.removePostVote(post.id, requester);
  assert.deepEqual(
    await VoteReadService.getPostVoteStates([post.id], requester.id),
    new Map([[post.id, { votesCount: 0, voteScore: 0, viewerVote: null }]]),
  );

  const downvote = await VoteService.savePostVote(post.id, requester, {
    voteType: VoteType.DOWNVOTE,
  });
  trackPostVote(downvote.id);
  assert.equal(downvote.counts.votesCount, 1);
  assert.equal(downvote.counts.voteScore, -1);
  assert.equal(downvote.viewerState.vote, VoteType.DOWNVOTE);
});
