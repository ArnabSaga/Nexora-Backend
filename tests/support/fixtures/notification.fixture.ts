import {
  NotificationTargetType,
  NotificationType,
} from "../../../src/generated/prisma/client";
import { prisma } from "../../../src/app/lib/prisma";
import type { TTestCleanup } from "../database/test-cleanup";

type TCreateTestNotificationInput = {
  cleanup: TTestCleanup;
  receiverId: string;
  senderId?: string | null;
  type?: NotificationType;
  message?: string;
  sourceKey?: string;
  targetType?: NotificationTargetType;
  targetId?: string;
  postId?: string;
  commentId?: string;
  communityId?: string;
  isRead?: boolean;
  createdAt?: Date;
};

export const createTestNotification = async ({
  cleanup,
  receiverId,
  senderId,
  type = NotificationType.FOLLOW,
  message = "started following you",
  sourceKey,
  targetType,
  targetId,
  postId,
  commentId,
  communityId,
  isRead,
  createdAt,
}: TCreateTestNotificationInput) => {
  const notification = await prisma.notification.create({
    data: {
      receiverId,
      senderId,
      type,
      message,
      sourceKey,
      targetType,
      targetId,
      postId,
      commentId,
      communityId,
      isRead,
      createdAt,
    },
  });
  cleanup.add(`notification:${notification.id}`, () =>
    prisma.notification.deleteMany({ where: { id: notification.id } }),
  );
  return notification;
};
