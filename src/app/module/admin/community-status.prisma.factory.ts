import type { Prisma } from "../../../generated/prisma/client";
import { createCommunityStatusWriter } from "./community-status.factory";

type TCommunityStatusPrismaClient = Pick<Prisma.TransactionClient, "community">;

export const createPrismaCommunityStatusWriter = (
  client: TCommunityStatusPrismaClient,
) =>
  createCommunityStatusWriter({
    read: (id) =>
      client.community.findUnique({
        where: { id },
        select: {
          id: true,
          isSuspended: true,
          deletedAt: true,
          updatedAt: true,
        },
      }),
    compareAndSwap: ({ id, expectedIsSuspended, desiredIsSuspended }) =>
      client.community.updateManyAndReturn({
        where: {
          id,
          deletedAt: null,
          isSuspended: expectedIsSuspended,
        },
        data: { isSuspended: desiredIsSuspended },
        select: {
          id: true,
          isSuspended: true,
          updatedAt: true,
        },
      }),
  });
