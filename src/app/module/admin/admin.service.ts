import { prisma } from "../../lib/prisma";
import { createAdminService } from "./admin.factory";
import { createConsistentPrismaAdminReader } from "./admin-read-consistent.prisma.factory";
import { createPrismaCommunityStatusWriter } from "./community-status.prisma.factory";

export const AdminService = createAdminService(
  createConsistentPrismaAdminReader(prisma),
  createPrismaCommunityStatusWriter(prisma),
);
