import { NotificationType } from "../../../generated/prisma/client";
import type { TNotificationEvent } from "../../shared/notifications/notification-event";
import type { TInsertedMention } from "./mention.interface";

type TPostMentionEventInput = {
  senderId: string;
  postId: string;
  insertedMentions: TInsertedMention[];
};

type TCommentMentionEventInput = {
  senderId: string;
  commentId: string;
  postId: string;
  insertedMentions: TInsertedMention[];
};

export const buildPostMentionEvents = ({
  senderId,
  postId,
  insertedMentions,
}: TPostMentionEventInput): TNotificationEvent[] =>
  insertedMentions.map((mention) => ({
    type: NotificationType.MENTION,
    senderId,
    receiverId: mention.mentionedUserId,
    sourceKey: `MENTION:POST:${mention.id}`,
    target: { type: "POST", id: postId },
  }));

export const buildCommentMentionEvents = ({
  senderId,
  commentId,
  postId,
  insertedMentions,
}: TCommentMentionEventInput): TNotificationEvent[] =>
  insertedMentions.map((mention) => ({
    type: NotificationType.MENTION,
    senderId,
    receiverId: mention.mentionedUserId,
    sourceKey: `MENTION:COMMENT:${mention.id}`,
    target: { type: "COMMENT", id: commentId, postId },
  }));
