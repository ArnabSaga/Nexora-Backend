import status from "http-status";
import {
  NotificationTargetType,
  type Prisma,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import { DISPLAYABLE_POST_COMMENT_WHERE } from "../../shared/policies/comment.policy";
import { buildReadableCommunityWhere } from "../../shared/policies/community.policy";
import { ACTIVE_PUBLIC_USER_WHERE } from "../../shared/policies/user.policy";
import { PostVisibilityService } from "../post/services/post-visibility.service";
import { DEFAULT_USER_SELECT } from "../user/user.constant";
import { mapPublicUser } from "../user/user.utils";
import { getCanonicalNotificationMessage } from "../../shared/notifications/notification-message";
import {
  NOTIFICATION_DEFAULT_LIMIT,
  NOTIFICATION_MAX_LIMIT,
} from "./notification.constant";
import {
  decodeNotificationCursor,
  encodeNotificationCursor,
} from "./notification.cursor";
import type {
  TNotificationListQuery,
  TNotificationResponse,
} from "./notification.interface";
import {
  NOTIFICATION_LIST_SELECT,
  type TNotificationListPayload,
} from "./notification.select";

const validateLimit = (limit?: number) => {
  const resolved = limit ?? NOTIFICATION_DEFAULT_LIMIT;
  if (
    !Number.isSafeInteger(resolved) ||
    resolved < 1 ||
    resolved > NOTIFICATION_MAX_LIMIT
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      `Limit must be between 1 and ${NOTIFICATION_MAX_LIMIT}`,
    );
  }
  return resolved;
};

const getNotifications = async (
  requester: Express.AuthenticatedUser,
  query: TNotificationListQuery,
) => {
  const limit = validateLimit(query.limit);
  const cursor = decodeNotificationCursor(query.cursor);
  const rows = await prisma.notification.findMany({
    where: {
      receiverId: requester.id,
      ...(query.isRead !== undefined && { isRead: query.isRead }),
      ...(cursor && {
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          { createdAt: new Date(cursor.createdAt), id: { lt: cursor.id } },
        ],
      }),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: NOTIFICATION_LIST_SELECT,
  });
  const hasNextPage = rows.length > limit;
  const returned = hasNextPage ? rows.slice(0, limit) : rows;
  const senderIds = returned.flatMap((row) =>
    row.senderId ? [row.senderId] : [],
  );
  const postIds = returned
    .filter((row) => row.targetType === NotificationTargetType.POST)
    .flatMap((row) => (row.targetId ? [row.targetId] : []));
  const commentIds = returned
    .filter((row) => row.targetType === NotificationTargetType.COMMENT)
    .flatMap((row) => (row.targetId ? [row.targetId] : []));
  const communityIds = returned
    .filter((row) => row.targetType === NotificationTargetType.COMMUNITY)
    .flatMap((row) => (row.targetId ? [row.targetId] : []));
  const [senders, posts, comments, communities] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: senderIds }, ...ACTIVE_PUBLIC_USER_WHERE },
      select: DEFAULT_USER_SELECT,
    }),
    prisma.post.findMany({
      where: {
        id: { in: postIds },
        ...PostVisibilityService.buildVisiblePostWhere(requester),
      },
      select: { id: true },
    }),
    prisma.comment.findMany({
      where: {
        id: { in: commentIds },
        ...DISPLAYABLE_POST_COMMENT_WHERE,
        post: { is: PostVisibilityService.buildVisiblePostWhere(requester) },
      },
      select: { id: true },
    }),
    prisma.community.findMany({
      where: {
        id: { in: communityIds },
        ...buildReadableCommunityWhere(requester),
      },
      select: { id: true },
    }),
  ]);
  const senderMap = new Map(
    senders.map((sender) => [sender.id, mapPublicUser(sender)]),
  );
  const availablePostIds = new Set(posts.map((item) => item.id));
  const availableCommentIds = new Set(comments.map((item) => item.id));
  const availableCommunityIds = new Set(communities.map((item) => item.id));
  const isTargetAvailable = (type: NotificationTargetType, id: string) => {
    if (type === NotificationTargetType.POST) return availablePostIds.has(id);
    if (type === NotificationTargetType.COMMENT) {
      return availableCommentIds.has(id);
    }
    return availableCommunityIds.has(id);
  };
  const mapRow = (row: TNotificationListPayload): TNotificationResponse => ({
    id: row.id,
    type: row.type,
    message: getCanonicalNotificationMessage(row.type, row.targetType),
    isRead: row.isRead,
    createdAt: row.createdAt,
    sender: row.senderId ? (senderMap.get(row.senderId) ?? null) : null,
    target:
      row.targetType && row.targetId
        ? {
            type: row.targetType,
            id: row.targetId,
            unavailable: !isTargetAvailable(row.targetType, row.targetId),
            ...(row.targetType === NotificationTargetType.COMMENT && row.postId
              ? { postId: row.postId }
              : {}),
          }
        : null,
  });
  const last = returned.at(-1);
  return {
    data: returned.map(mapRow),
    meta: {
      nextCursor: last
        ? encodeNotificationCursor({
            createdAt: last.createdAt.toISOString(),
            id: last.id,
          })
        : null,
      hasNextPage,
      limit,
    },
  };
};

const markRead = async (id: string, requester: Express.AuthenticatedUser) => {
  await prisma.notification.updateMany({
    where: { id, receiverId: requester.id },
    data: { isRead: true },
  });
  return { isRead: true };
};
const markAllRead = async (requester: Express.AuthenticatedUser) => {
  const result = await prisma.notification.updateMany({
    where: { receiverId: requester.id, isRead: false },
    data: { isRead: true },
  });
  return { updatedCount: result.count };
};
const deleteNotification = async (
  id: string,
  requester: Express.AuthenticatedUser,
) => {
  await prisma.notification.deleteMany({
    where: { id, receiverId: requester.id },
  });
  return null;
};

export const NotificationService = {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
};
