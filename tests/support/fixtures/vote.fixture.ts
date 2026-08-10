import { VoteType } from "../../../src/generated/prisma/client";
import { prisma } from "../../../src/app/lib/prisma";
import type { TTestCleanup } from "../database/test-cleanup";

type TCreatePostVoteInput = {
  cleanup: TTestCleanup;
  userId: string;
  postId: string;
  voteType?: VoteType;
};

type TCreateCommentVoteInput = {
  cleanup: TTestCleanup;
  userId: string;
  commentId: string;
  voteType?: VoteType;
};

export const createTestPostVote = async ({
  cleanup,
  userId,
  postId,
  voteType = VoteType.UPVOTE,
}: TCreatePostVoteInput) => {
  const vote = await prisma.postVote.create({
    data: { userId, postId, voteType },
  });

  cleanup.add(`post-vote:${vote.id}`, () =>
    prisma.postVote.deleteMany({ where: { id: vote.id } }),
  );

  return vote;
};

export const createTestCommentVote = async ({
  cleanup,
  userId,
  commentId,
  voteType = VoteType.UPVOTE,
}: TCreateCommentVoteInput) => {
  const vote = await prisma.commentVote.create({
    data: { userId, commentId, voteType },
  });

  cleanup.add(`comment-vote:${vote.id}`, () =>
    prisma.commentVote.deleteMany({ where: { id: vote.id } }),
  );

  return vote;
};
