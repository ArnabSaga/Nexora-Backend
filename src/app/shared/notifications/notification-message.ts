import {
  NotificationTargetType,
  NotificationType,
} from "../../../generated/prisma/client";

export const getCanonicalNotificationMessage = (
  type: NotificationType,
  targetType?: NotificationTargetType | null,
): string => {
  if (type === NotificationType.REACTION) {
    if (targetType === NotificationTargetType.COMMENT) {
      return "reacted to your comment";
    }
    if (targetType === NotificationTargetType.POST) {
      return "reacted to your post";
    }
    return "reacted to your content";
  }

  const messages = {
    [NotificationType.FOLLOW]: "started following you",
    [NotificationType.COMMENT]: "commented on your post",
    [NotificationType.REPLY]: "replied to your comment",
    [NotificationType.MENTION]: "mentioned you in a post",
    [NotificationType.REPOST]: "reposted your post",
    [NotificationType.COMMUNITY_INVITE]: "invited you to a community",
    [NotificationType.COMMUNITY_ROLE_UPDATE]: "updated your community role",
  } as const;

  return messages[type] ?? "sent you a notification";
};
