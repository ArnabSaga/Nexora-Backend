import status from "http-status";
import { NotificationType } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import { DISPLAYABLE_POST_COMMENT_WHERE } from "../../shared/policies/comment.policy";
import { buildAvailableParticipationWhere } from "../../shared/policies/community.policy";
import { PostVisibilityService } from "../post/services/post-visibility.service";
import { createPrismaNotificationWriter } from "../../shared/notifications/notification-writer.prisma.factory";
import { REACTION_RESPONSE_SELECT } from "./reaction.constant";
import type { TReactionPayload, TReactionResponse } from "./reaction.interface";
import { createReactionNotificationClaimService } from "./reaction-notification-claim.factory";

const savePostReaction = async (
  postId: string,
  requester: Express.AuthenticatedUser,
  payload: TReactionPayload,
): Promise<TReactionResponse> => {
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
      authorId: true,
    },
  });

  if (!post) {
    throw new AppError(status.NOT_FOUND, "Post not found");
  }

  return prisma.$transaction(async (tx) => {
    const reaction = await tx.postReaction.upsert({
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
    const writer = createPrismaNotificationWriter(tx);
    const claimService = createReactionNotificationClaimService({
      claimNotification: async (reactionId) => {
        const result = await tx.postReaction.updateMany({
          where: { id: reactionId, notificationClaimedAt: null },
          data: { notificationClaimedAt: new Date() },
        });
        return result.count === 1;
      },
      writeNotification: async (event) => writer.writeEvents([event]),
    });
    await claimService.claimAndNotify(reaction.id, {
      type: NotificationType.REACTION,
      senderId: requester.id,
      receiverId: post.authorId,
      sourceKey: `REACTION:POST:${reaction.id}`,
      target: { type: "POST", id: postId },
    });
    return reaction;
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
      authorId: true,
      postId: true,
    },
  });

  if (!comment) {
    throw new AppError(status.NOT_FOUND, "Comment not found");
  }

  return prisma.$transaction(async (tx) => {
    const reaction = await tx.commentReaction.upsert({
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
    const writer = createPrismaNotificationWriter(tx);
    const claimService = createReactionNotificationClaimService({
      claimNotification: async (reactionId) => {
        const result = await tx.commentReaction.updateMany({
          where: { id: reactionId, notificationClaimedAt: null },
          data: { notificationClaimedAt: new Date() },
        });
        return result.count === 1;
      },
      writeNotification: async (event) => writer.writeEvents([event]),
    });
    await claimService.claimAndNotify(reaction.id, {
      type: NotificationType.REACTION,
      senderId: requester.id,
      receiverId: comment.authorId,
      sourceKey: `REACTION:COMMENT:${reaction.id}`,
      target: { type: "COMMENT", id: commentId, postId: comment.postId },
    });
    return reaction;
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
