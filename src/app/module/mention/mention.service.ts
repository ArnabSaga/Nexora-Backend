import { prisma } from "../../lib/prisma";
import type { TMentionPrismaClient } from "./mention.interface";
import { normalizeMentionedUserIds } from "./mention.util";
import { createPrismaMentionWriter } from "./mention-write.prisma.factory";

export const MentionService = {
  normalize: normalizeMentionedUserIds,
  validateUsers: (normalizedIds: string[]) =>
    createPrismaMentionWriter(prisma).validateUsers(normalizedIds),
  forClient: (client: TMentionPrismaClient) =>
    createPrismaMentionWriter(client),
};
