import { prisma } from "../../lib/prisma";
import { createConsistentPrismaTrendingReader } from "./trending-consistent.prisma.factory";
import { createTrendingService } from "./trending.factory";

const systemClock = { now: () => new Date() };

export const TrendingService = createTrendingService(
  createConsistentPrismaTrendingReader(prisma),
  systemClock,
);

export const TrendingHashtagService = {
  getTrending: TrendingService.getTrendingHashtags,
};
