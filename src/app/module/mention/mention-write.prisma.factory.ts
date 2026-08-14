import { ACTIVE_PUBLIC_USER_WHERE } from "../../shared/policies/user.policy";
import type { TMentionPrismaClient } from "./mention.interface";
import { createMentionWriter } from "./mention-write.factory";

export const createPrismaMentionWriter = (client: TMentionPrismaClient) =>
  createMentionWriter({
    findEligibleUserIds: async (ids) => {
      const users = await client.user.findMany({
        where: { id: { in: ids }, ...ACTIVE_PUBLIC_USER_WHERE },
        select: { id: true },
      });
      return users.map((user) => user.id);
    },
    findMentions: (target, targetId) =>
      target === "POST"
        ? client.postMention.findMany({
            where: { postId: targetId },
            select: { id: true, mentionedUserId: true },
          })
        : client.commentMention.findMany({
            where: { commentId: targetId },
            select: { id: true, mentionedUserId: true },
          }),
    clearMentions: async (target, targetId) => {
      if (target === "POST") {
        await client.postMention.deleteMany({ where: { postId: targetId } });
      } else {
        await client.commentMention.deleteMany({
          where: { commentId: targetId },
        });
      }
    },
    deleteMentions: async (target, targetId, mentionedUserIds) => {
      if (target === "POST") {
        await client.postMention.deleteMany({
          where: {
            postId: targetId,
            mentionedUserId: { in: mentionedUserIds },
          },
        });
      } else {
        await client.commentMention.deleteMany({
          where: {
            commentId: targetId,
            mentionedUserId: { in: mentionedUserIds },
          },
        });
      }
    },
    createMentions: (target, targetId, mentionedUserIds) =>
      target === "POST"
        ? client.postMention.createManyAndReturn({
            data: mentionedUserIds.map((mentionedUserId) => ({
              postId: targetId,
              mentionedUserId,
            })),
            skipDuplicates: true,
            select: { id: true, mentionedUserId: true },
          })
        : client.commentMention.createManyAndReturn({
            data: mentionedUserIds.map((mentionedUserId) => ({
              commentId: targetId,
              mentionedUserId,
            })),
            skipDuplicates: true,
            select: { id: true, mentionedUserId: true },
          }),
  });
