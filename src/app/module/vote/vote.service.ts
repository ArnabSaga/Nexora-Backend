import status from "http-status";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import { DISPLAYABLE_POST_COMMENT_WHERE } from "../../shared/policies/comment.policy";
import { buildAvailableParticipationWhere } from "../../shared/policies/community.policy";
import { PostVisibilityService } from "../post/services/post-visibility.service";
import { VOTE_RESPONSE_SELECT } from "./vote.constant";
import type {
  TCommentVoteResponse,
  TPostVoteResponse,
  TVotePayload,
} from "./vote.interface";
import { createPrismaVoteReadService } from "./vote-read.prisma.factory";

type TVoteMutationBindings = {
  createVoteReadService: typeof createPrismaVoteReadService;
};

const savePostVoteMutation = async (
  postId: string,
  requester: Express.AuthenticatedUser,
  payload: TVotePayload,
  bindings: TVoteMutationBindings,
): Promise<TPostVoteResponse> => {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      AND: [
        PostVisibilityService.buildVisiblePostWhere(requester),
        {
          OR: [
            { communityId: null },
            {
              community: {
                is: buildAvailableParticipationWhere(requester.id),
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (!post) {
    throw new AppError(status.NOT_FOUND, "Post not found");
  }

  return prisma.$transaction(async (tx) => {
    const vote = await tx.postVote.upsert({
      where: {
        userId_postId: {
          userId: requester.id,
          postId,
        },
      },
      create: {
        userId: requester.id,
        postId,
        voteType: payload.voteType,
      },
      update: {
        voteType: payload.voteType,
      },
      select: VOTE_RESPONSE_SELECT,
    });
    const states = await bindings
      .createVoteReadService(tx)
      .getPostVoteStates([postId], requester.id);
    const state = states.get(postId)!;

    return {
      ...vote,
      counts: {
        votesCount: state.votesCount,
        voteScore: state.voteScore,
      },
      viewerState: {
        vote: state.viewerVote,
      },
    };
  });
};

const removePostVote = async (
  postId: string,
  requester: Express.AuthenticatedUser,
): Promise<void> => {
  await prisma.postVote.deleteMany({
    where: {
      userId: requester.id,
      postId,
    },
  });
};

const saveCommentVoteMutation = async (
  commentId: string,
  requester: Express.AuthenticatedUser,
  payload: TVotePayload,
  bindings: TVoteMutationBindings,
): Promise<TCommentVoteResponse> => {
  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      ...DISPLAYABLE_POST_COMMENT_WHERE,
      post: {
        is: {
          AND: [
            PostVisibilityService.buildVisiblePostWhere(requester),
            {
              OR: [
                { communityId: null },
                {
                  community: {
                    is: buildAvailableParticipationWhere(requester.id),
                  },
                },
              ],
            },
          ],
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!comment) {
    throw new AppError(status.NOT_FOUND, "Comment not found");
  }

  return prisma.$transaction(async (tx) => {
    const vote = await tx.commentVote.upsert({
      where: {
        userId_commentId: {
          userId: requester.id,
          commentId,
        },
      },
      create: {
        userId: requester.id,
        commentId,
        voteType: payload.voteType,
      },
      update: {
        voteType: payload.voteType,
      },
      select: VOTE_RESPONSE_SELECT,
    });
    const states = await bindings
      .createVoteReadService(tx)
      .getCommentVoteStates([commentId], requester.id);
    const state = states.get(commentId)!;

    return {
      ...vote,
      counts: {
        votes: state.votesCount,
        voteScore: state.voteScore,
      },
      viewerState: {
        vote: state.viewerVote,
      },
    };
  });
};

const removeCommentVote = async (
  commentId: string,
  requester: Express.AuthenticatedUser,
): Promise<void> => {
  await prisma.commentVote.deleteMany({
    where: {
      userId: requester.id,
      commentId,
    },
  });
};

export const createVoteMutationService = (bindings: TVoteMutationBindings) => ({
  savePostVote: (
    postId: string,
    requester: Express.AuthenticatedUser,
    payload: TVotePayload,
  ) => savePostVoteMutation(postId, requester, payload, bindings),
  saveCommentVote: (
    commentId: string,
    requester: Express.AuthenticatedUser,
    payload: TVotePayload,
  ) => saveCommentVoteMutation(commentId, requester, payload, bindings),
});

const VoteMutationService = createVoteMutationService({
  createVoteReadService: createPrismaVoteReadService,
});

export const VoteService = {
  savePostVote: VoteMutationService.savePostVote,
  removePostVote,
  saveCommentVote: VoteMutationService.saveCommentVote,
  removeCommentVote,
};
