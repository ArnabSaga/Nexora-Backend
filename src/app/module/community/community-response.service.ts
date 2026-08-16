import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { createCommunityResponseService } from "./community-response.factory";

export type TCommunityResponsePrismaClient = Pick<
  Prisma.TransactionClient,
  "communityMember"
>;

export const createPrismaCommunityResponseService = (
  client: TCommunityResponsePrismaClient,
) =>
  createCommunityResponseService({
    findViewerMemberships: async (communityIds, viewer) => {
      if (!viewer || !communityIds.length) return [];

      return client.communityMember.findMany({
        where: {
          userId: viewer.id,
          communityId: { in: [...new Set(communityIds)] },
        },
        select: { communityId: true, role: true, status: true },
      });
    },
  });

export const CommunityResponseService =
  createPrismaCommunityResponseService(prisma);
