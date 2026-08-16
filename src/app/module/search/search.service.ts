import { prisma } from "../../lib/prisma";
import { createConsistentPrismaSearchReader } from "./search-consistent.prisma.factory";
import { createSearchService } from "./search.factory";

export const SearchService = createSearchService(
  createConsistentPrismaSearchReader(prisma),
);
