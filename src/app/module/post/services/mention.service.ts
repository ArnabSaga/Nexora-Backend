import status from "http-status";
import { Prisma, UserStatus } from "../../../../generated/prisma/client";
import AppError from "../../../shared/errors/AppError";

const dedupeMentionedUserIds = (mentionedUserIds: string[] = []) => {
  return [...new Set(mentionedUserIds)];
};

const validateMentionedUsers = async (
  tx: Prisma.TransactionClient,
  mentionedUserIds: string[] = [],
) => {
  const uniqueIds = dedupeMentionedUserIds(mentionedUserIds);

  if (!uniqueIds.length) {
    return [];
  }

  const users = await tx.user.findMany({
    where: {
      id: {
        in: uniqueIds,
      },
      status: UserStatus.ACTIVE,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (users.length !== uniqueIds.length) {
    throw new AppError(status.BAD_REQUEST, "One or more mentioned users are invalid");
  }

  return uniqueIds;
};

const syncPostMentions = async (
  tx: Prisma.TransactionClient,
  postId: string,
  mentionedUserIds: string[] = [],
) => {
  const uniqueIds = await validateMentionedUsers(tx, mentionedUserIds);

  await tx.postMention.deleteMany({
    where: {
      postId,
    },
  });

  if (!uniqueIds.length) {
    return;
  }

  await tx.postMention.createMany({
    data: uniqueIds.map((mentionedUserId) => ({
      postId,
      mentionedUserId,
    })),
  });
};

export const MentionService = {
  dedupeMentionedUserIds,
  validateMentionedUsers,
  syncPostMentions,
};
