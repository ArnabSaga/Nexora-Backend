import type { TNotificationEvent } from "../../shared/notifications/notification-event";

type TReactionNotificationClaimDependencies = {
  claimNotification: (reactionId: string) => Promise<boolean>;
  writeNotification: (event: TNotificationEvent) => Promise<void>;
};

export const createReactionNotificationClaimService = ({
  claimNotification,
  writeNotification,
}: TReactionNotificationClaimDependencies) => {
  const claimAndNotify = async (
    reactionId: string,
    event: TNotificationEvent,
  ): Promise<boolean> => {
    const claimed = await claimNotification(reactionId);
    if (!claimed) {
      return false;
    }

    await writeNotification(event);
    return true;
  };

  return { claimAndNotify };
};
