import type { Prisma } from "../../../generated/prisma/client";
import { PostSelect } from "../post/constants/post.select";
import { createPrismaPostResponseService } from "../post/services/post-response.service";
import { PostVisibilityService } from "../post/services/post-visibility.service";
import { TRENDING_POST_ORDER_BY } from "./trending.constant";
import type {
  TNormalizedTrendingHashtagQuery,
  TNormalizedTrendingPostQuery,
  TTrendingReader,
} from "./trending.interface";

export type TTrendingPrismaClient = Pick<
  Prisma.TransactionClient,
  "post" | "postVote" | "commentVote" | "bookmark" | "postHashtag" | "hashtag"
>;

export const buildTrendingPostWhere = (
  query: Pick<TNormalizedTrendingPostQuery, "windowStart" | "windowEnd">,
): Prisma.PostWhereInput => ({
  AND: [
    PostVisibilityService.buildPublicOnlyWhere(),
    {
      createdAt: {
        gte: query.windowStart,
        lte: query.windowEnd,
      },
    },
  ],
});

export const createPrismaTrendingReader = (
  client: TTrendingPrismaClient,
): TTrendingReader => {
  const postResponseService = createPrismaPostResponseService(client);

  return {
    getTrendingPosts: async (query, viewer) => {
      const where = buildTrendingPostWhere(query);
      const [total, rows] = await Promise.all([
        client.post.count({ where }),
        client.post.findMany({
          where,
          orderBy: [...TRENDING_POST_ORDER_BY],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          select: PostSelect.FEED,
        }),
      ]);

      return {
        data: await postResponseService.enrichPosts(rows, viewer),
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    },

    getTrendingHashtags: async (query: TNormalizedTrendingHashtagQuery) => {
      const recentPublicPostWhere = buildTrendingPostWhere(query);
      const ranking = await client.postHashtag.groupBy({
        by: ["hashtagId"],
        where: { post: { is: recentPublicPostWhere } },
        _count: { hashtagId: true },
        orderBy: [{ _count: { hashtagId: "desc" } }, { hashtagId: "asc" }],
        take: query.limit,
      });
      if (!ranking.length) return [];

      const hashtags = await client.hashtag.findMany({
        where: { id: { in: ranking.map((item) => item.hashtagId) } },
        select: { id: true, name: true },
      });
      const byId = new Map(hashtags.map((hashtag) => [hashtag.id, hashtag]));

      return ranking.map((item) => {
        const hashtag = byId.get(item.hashtagId);
        if (!hashtag) {
          throw new Error("Trending hashtag selection invariant failed");
        }
        return { ...hashtag, postCount: item._count.hashtagId };
      });
    },
  };
};
