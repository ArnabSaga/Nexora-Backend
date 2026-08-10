import { prisma } from "../../lib/prisma";
import { createPrismaVoteReadService } from "./vote-read.prisma.factory";

export const VoteReadService = createPrismaVoteReadService(prisma);
