import status from "http-status";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import { DISPLAYABLE_POST_COMMENT_WHERE } from "../../shared/policies/comment.policy";
import { PostVisibilityService } from "../post/services/post-visibility.service";
import { REACTION_RESPONSE_SELECT } from "./reaction.constant";
import type {
  TReactionPayload,
  TReactionResponse,
} from "./reaction.interface";

const savePostReaction = async (
  postId: string,
  requester: Express.AuthenticatedUser,
  payload: TReactionPayload,
): Promise<TReactionResponse> => {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      ...PostVisibilityService.buildVisiblePostWhere(requester),
    },
    select: {
      id: true,
    },
  });

  if (!post) {
    throw new AppError(status.NOT_FOUND, "Post not found");
  }

  return prisma.postReaction.upsert({
    where: {
      userId_postId: {
        userId: requester.id,
        postId,
      },
    },
    create: {
      userId: requester.id,
      postId,
      reactionType: payload.reactionType,
    },
    update: {
      reactionType: payload.reactionType,
    },
    select: REACTION_RESPONSE_SELECT,
  });
};

const removePostReaction = async (
  postId: string,
  requester: Express.AuthenticatedUser,
): Promise<void> => {
  await prisma.postReaction.deleteMany({
    where: {
      userId: requester.id,
      postId,
    },
  });
};

const saveCommentReaction = async (
  commentId: string,
  requester: Express.AuthenticatedUser,
  payload: TReactionPayload,
): Promise<TReactionResponse> => {
  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      ...DISPLAYABLE_POST_COMMENT_WHERE,
      post: {
        is: PostVisibilityService.buildVisiblePostWhere(requester),
      },
    },
    select: {
      id: true,
    },
  });

  if (!comment) {
    throw new AppError(status.NOT_FOUND, "Comment not found");
  }

  return prisma.commentReaction.upsert({
    where: {
      userId_commentId: {
        userId: requester.id,
        commentId,
      },
    },
    create: {
      userId: requester.id,
      commentId,
      reactionType: payload.reactionType,
    },
    update: {
      reactionType: payload.reactionType,
    },
    select: REACTION_RESPONSE_SELECT,
  });
};

const removeCommentReaction = async (
  commentId: string,
  requester: Express.AuthenticatedUser,
): Promise<void> => {
  await prisma.commentReaction.deleteMany({
    where: {
      userId: requester.id,
      commentId,
    },
  });
};

export const ReactionService = {
  savePostReaction,
  removePostReaction,
  saveCommentReaction,
  removeCommentReaction,
};
