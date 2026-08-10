import type { Prisma } from "../../../generated/prisma/client";
import { createVoteReadService } from "./vote-read.factory";

export type TVoteReadPrismaClient = Pick<
  Prisma.TransactionClient,
  "postVote" | "commentVote"
>;

export const createPrismaVoteReadService = (
  client: TVoteReadPrismaClient,
) => {
  const getPostAggregates = async (postIds: string[]) => {
    return client.postVote.groupBy({
      by: ["postId", "voteType"],
      where: { postId: { in: postIds } },
      _count: { _all: true },
    });
  };

  const getViewerPostVotes = (postIds: string[], viewerId: string) => {
    return client.postVote.findMany({
      where: { userId: viewerId, postId: { in: postIds } },
      select: { postId: true, voteType: true },
    });
  };

  const getCommentAggregates = async (commentIds: string[]) => {
    return client.commentVote.groupBy({
      by: ["commentId", "voteType"],
      where: { commentId: { in: commentIds } },
      _count: { _all: true },
    });
  };

  const getViewerCommentVotes = (
    commentIds: string[],
    viewerId: string,
  ) => {
    return client.commentVote.findMany({
      where: { userId: viewerId, commentId: { in: commentIds } },
      select: { commentId: true, voteType: true },
    });
  };

  return createVoteReadService({
    getPostAggregates,
    getViewerPostVotes,
    getCommentAggregates,
    getViewerCommentVotes,
  });
};
