import {
  NotificationTargetType,
  UserStatus,
  type Prisma,
} from "../../../generated/prisma/client";
import type { TNotificationEvent } from "./notification-event";
import { getCanonicalNotificationMessage } from "./notification-message";

type TNotificationWriterDependencies = {
  findEligibleReceiverIds: (ids: string[]) => Promise<string[]>;
  createNotifications: (
    data: Prisma.NotificationCreateManyInput[],
  ) => Promise<void>;
};

const toCreateInput = (
  event: TNotificationEvent,
): Prisma.NotificationCreateManyInput => {
  const target = event.target;

  return {
    receiverId: event.receiverId,
    senderId: event.senderId,
    type: event.type,
    sourceKey: "sourceKey" in event ? event.sourceKey : null,
    message: getCanonicalNotificationMessage(event.type, target?.type),
    targetType: target?.type ?? null,
    targetId: target?.id ?? null,
    postId:
      target?.type === NotificationTargetType.POST
        ? target.id
        : target?.type === NotificationTargetType.COMMENT
          ? target.postId
          : null,
    commentId:
      target?.type === NotificationTargetType.COMMENT ? target.id : null,
    communityId:
      target?.type === NotificationTargetType.COMMUNITY ? target.id : null,
  };
};

export const createNotificationWriter = ({
  findEligibleReceiverIds,
  createNotifications,
}: TNotificationWriterDependencies) => {
  const writeEvents = async (events: TNotificationEvent[]) => {
    const candidates = events.filter(
      (event) => event.senderId !== event.receiverId,
    );

    if (!candidates.length) {
      return;
    }

    const receiverIds = [
      ...new Set(candidates.map((event) => event.receiverId)),
    ];
    const eligible = new Set(await findEligibleReceiverIds(receiverIds));
    const data = candidates
      .filter((event) => eligible.has(event.receiverId))
      .map(toCreateInput);

    if (data.length) {
      await createNotifications(data);
    }
  };

  return { writeEvents };
};

export const NOTIFICATION_RECEIVER_WHERE = {
  status: UserStatus.ACTIVE,
  deletedAt: null,
} satisfies Prisma.UserWhereInput;

export type TNotificationWriter = ReturnType<typeof createNotificationWriter>;
