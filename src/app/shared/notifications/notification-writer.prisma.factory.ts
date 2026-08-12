import type { Prisma } from "../../../generated/prisma/client";
import {
  createNotificationWriter,
  NOTIFICATION_RECEIVER_WHERE,
} from "./notification-writer.factory";

export type TNotificationWriterPrismaClient = Pick<
  Prisma.TransactionClient,
  "user" | "notification"
>;

export const createPrismaNotificationWriter = (
  client: TNotificationWriterPrismaClient,
) =>
  createNotificationWriter({
    findEligibleReceiverIds: async (ids) => {
      const users = await client.user.findMany({
        where: { id: { in: ids }, ...NOTIFICATION_RECEIVER_WHERE },
        select: { id: true },
      });

      return users.map((user) => user.id);
    },
    createNotifications: async (data) => {
      await client.notification.createMany({ data, skipDuplicates: true });
    },
  });
