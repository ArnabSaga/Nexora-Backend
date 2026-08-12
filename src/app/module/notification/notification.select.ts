import type { Prisma } from "../../../generated/prisma/client";

export const NOTIFICATION_LIST_SELECT = {
  id: true,
  senderId: true,
  postId: true,
  targetType: true,
  targetId: true,
  type: true,
  isRead: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export type TNotificationListPayload = Prisma.NotificationGetPayload<{
  select: typeof NOTIFICATION_LIST_SELECT;
}>;
