import { NotificationType } from "../../../generated/prisma/client";

type TEventBase = {
  senderId: string;
  receiverId: string;
};

type TKeyedEvent = TEventBase & {
  sourceKey: string;
};

export type TNotificationEvent =
  | (TKeyedEvent & { type: typeof NotificationType.FOLLOW; target: null })
  | (TKeyedEvent & {
      type: typeof NotificationType.REACTION;
      target:
        | { type: "POST"; id: string }
        | { type: "COMMENT"; id: string; postId: string };
    })
  | (TKeyedEvent & {
      type: typeof NotificationType.COMMENT | typeof NotificationType.REPLY;
      target: { type: "COMMENT"; id: string; postId: string };
    })
  | (TKeyedEvent & {
      type: typeof NotificationType.MENTION | typeof NotificationType.REPOST;
      target: { type: "POST"; id: string };
    })
  | (TEventBase & {
      type: typeof NotificationType.COMMUNITY_ROLE_UPDATE;
      target: { type: "COMMUNITY"; id: string };
      sourceKey?: never;
    })
  | (TKeyedEvent & {
      type: typeof NotificationType.COMMUNITY_INVITE;
      target: { type: "COMMUNITY"; id: string };
    });
