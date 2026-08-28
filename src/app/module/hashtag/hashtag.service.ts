import status from "http-status";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import { parseHashtagPathTag } from "../../shared/hashtags/hashtag.util";
import { PostSelect } from "../post/constants/post.select";
import { PostResponseService } from "../post/services/post-response.service";
import { PostVisibilityService } from "../post/services/post-visibility.service";
import { TrendingHashtagService } from "../trending";
import { HASHTAG_DEFAULT_LIMIT, HASHTAG_MAX_LIMIT } from "./hashtag.constant";
import { decodeHashtagCursor, encodeHashtagCursor } from "./hashtag.cursor";
import type {
  THashtagPostListResult,
  THashtagPostQuery,
  THashtagTrendingQuery,
  TTrendingHashtag,
} from "./hashtag.interface";

const validateLimit = (limit?: number) => {
  const resolved = limit ?? HASHTAG_DEFAULT_LIMIT;
  if (
    !Number.isSafeInteger(resolved) ||
    resolved < 1 ||
    resolved > HASHTAG_MAX_LIMIT
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      `Limit must be between 1 and ${HASHTAG_MAX_LIMIT}`,
    );
  }
  return resolved;
};

const validateTag = (tag: unknown) => {
  const normalized = parseHashtagPathTag(tag);
  if (!normalized) throw new AppError(status.BAD_REQUEST, "Invalid hashtag");
  return normalized;
};

const validateQueryKeys = (query: object, allowed: string[]) => {
  if (Object.keys(query).some((key) => !allowed.includes(key))) {
    throw new AppError(status.BAD_REQUEST, "Invalid hashtag query");
  }
};

const getTrending = async (
  query: THashtagTrendingQuery,
): Promise<TTrendingHashtag[]> => TrendingHashtagService.getTrending(query);

const getPostsByHashtag = async (
  tag: unknown,
  query: THashtagPostQuery,
): Promise<THashtagPostListResult> => {
  validateQueryKeys(query, ["cursor", "limit"]);
  const name = validateTag(tag);
  const limit = validateLimit(query.limit);
  const cursor = decodeHashtagCursor(query.cursor);
  const rows = await prisma.post.findMany({
    where: {
      AND: [
        PostVisibilityService.buildPublicOnlyWhere(),
        { hashtags: { some: { hashtag: { is: { name } } } } },
        ...(cursor
          ? [
              {
                OR: [
                  { createdAt: { lt: new Date(cursor.createdAt) } },
                  {
                    createdAt: new Date(cursor.createdAt),
                    id: { lt: cursor.id },
                  },
                ],
              },
            ]
          : []),
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: PostSelect.FEED,
  });
  const hasNextPage = rows.length > limit;
  const returned = hasNextPage ? rows.slice(0, limit) : rows;
  const last = returned.at(-1);

  return {
    data: await PostResponseService.enrichPosts(returned, undefined),
    meta: {
      nextCursor: last
        ? encodeHashtagCursor({
            createdAt: last.createdAt.toISOString(),
            id: last.id,
          })
        : null,
      hasNextPage,
      limit,
    },
  };
};

export const HashtagService = { getTrending, getPostsByHashtag };
