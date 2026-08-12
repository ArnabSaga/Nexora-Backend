import type {
  NotificationTargetType,
  NotificationType,
} from "../../../generated/prisma/client";
import type { TPublicUser } from "../user/user.interface";

export type TNotificationListQuery = {
  cursor?: string;
  limit?: number;
  isRead?: boolean;
};

export type TNotificationCursorPayload = {
  version: 1;
  createdAt: string;
  id: string;
};

export type TNotificationTarget = {
  type: NotificationTargetType;
  id: string;
  unavailable: boolean;
  postId?: string;
};

export type TNotificationResponse = {
  id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: Date;
  sender: TPublicUser | null;
  target: TNotificationTarget | null;
};
