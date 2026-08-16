import type { Prisma } from "../../../generated/prisma/client";
import { ACTIVE_PUBLIC_USER_WHERE } from "../../shared/policies/user.policy";
import { buildReadableCommunityWhere } from "../../shared/policies/community.policy";
import { createPrismaCommunityResponseService } from "../community/community-response.service";
import { CommunitySelect } from "../community/community.select";
import { PostSelect } from "../post/constants/post.select";
import { createPrismaPostResponseService } from "../post/services/post-response.service";
import { PostVisibilityService } from "../post/services/post-visibility.service";
import { DEFAULT_USER_SELECT } from "../user/user.constant";
import { mapPublicUser } from "../user/user.utils";
import type {
  TNormalizedSearchQuery,
  TSearchBucket,
  TSearchBucketCounts,
  TSearchReader,
} from "./search.interface";
import {
  calculateRankedSearchSlices,
  createSearchMeta,
} from "./search-ranked-pagination";

export type TSearchPrismaClient = Pick<
  Prisma.TransactionClient,
  | "user"
  | "post"
  | "postVote"
  | "commentVote"
  | "bookmark"
  | "community"
  | "communityMember"
  | "hashtag"
  | "postHashtag"
>;

const BUCKETS = ["exact", "prefix", "contains"] as const;
const entityOrderBy = [{ createdAt: "desc" }, { id: "desc" }] as const;

const executeRankedPage = async <T>({
  query,
  count,
  fetch,
}: {
  query: TNormalizedSearchQuery;
  count: (bucket: TSearchBucket) => Promise<number>;
  fetch: (bucket: TSearchBucket, skip: number, take: number) => Promise<T[]>;
}) => {
  const countValues = await Promise.all(BUCKETS.map((bucket) => count(bucket)));
  const counts: TSearchBucketCounts = {
    exact: countValues[0],
    prefix: countValues[1],
    contains: countValues[2],
  };
  const slices = calculateRankedSearchSlices({
    page: query.page,
    limit: query.limit,
    counts,
  });
  const pages = await Promise.all(
    slices.map((slice) => fetch(slice.bucket, slice.skip, slice.take)),
  );

  return {
    rows: pages.flat(),
    meta: createSearchMeta(query.page, query.limit, counts),
  };
};

const stringFilters = (query: TNormalizedSearchQuery) => ({
  exact: { equals: query.normalizedQuery, mode: "insensitive" } as const,
  prefix: { startsWith: query.patternQuery, mode: "insensitive" } as const,
  contains: { contains: query.patternQuery, mode: "insensitive" } as const,
});

const exclusiveBuckets = <T>(exact: T, prefix: T, contains: T) => ({
  exact,
  prefix: { AND: [prefix, { NOT: exact }] },
  contains: { AND: [contains, { NOT: exact }, { NOT: prefix }] },
});

export const buildUserBuckets = (
  query: TNormalizedSearchQuery,
): Record<TSearchBucket, Prisma.UserWhereInput> => {
  const filters = stringFilters(query);
  const match = (
    filter: (typeof filters)[TSearchBucket],
  ): Prisma.UserWhereInput => ({
    OR: [
      { name: filter },
      { profile: { is: { username: filter } } },
      { profile: { is: { headline: filter } } },
      { profile: { is: { profession: filter } } },
      { profile: { is: { company: filter } } },
    ],
  });
  return exclusiveBuckets(
    match(filters.exact),
    match(filters.prefix),
    match(filters.contains),
  );
};

export const buildPostBuckets = (
  query: TNormalizedSearchQuery,
): Record<TSearchBucket, Prisma.PostWhereInput> => {
  const filters = stringFilters(query);
  const match = (
    filter: (typeof filters)[TSearchBucket],
  ): Prisma.PostWhereInput => ({
    OR: [
      { content: filter },
      {
        hashtags: {
          some: { hashtag: { is: { name: filter } } },
        },
      },
    ],
  });
  return exclusiveBuckets(
    match(filters.exact),
    match(filters.prefix),
    match(filters.contains),
  );
};

export const buildCommunityBuckets = (
  query: TNormalizedSearchQuery,
): Record<TSearchBucket, Prisma.CommunityWhereInput> => {
  const filters = stringFilters(query);
  const match = (
    filter: (typeof filters)[TSearchBucket],
  ): Prisma.CommunityWhereInput => ({
    OR: [{ name: filter }, { slug: filter }, { description: filter }],
  });
  return exclusiveBuckets(
    match(filters.exact),
    match(filters.prefix),
    match(filters.contains),
  );
};

export const buildHashtagBuckets = (
  query: TNormalizedSearchQuery,
): Record<TSearchBucket, Prisma.HashtagWhereInput> => {
  const filters = stringFilters(query);
  return exclusiveBuckets(
    { name: filters.exact },
    { name: filters.prefix },
    { name: filters.contains },
  );
};

export const createPrismaSearchReader = (
  client: TSearchPrismaClient,
): TSearchReader => {
  const postResponseService = createPrismaPostResponseService(client);
  const communityResponseService =
    createPrismaCommunityResponseService(client);

  const reader: TSearchReader = {
    searchUsers: async (query) => {
      const buckets = buildUserBuckets(query);
      const whereFor = (bucket: TSearchBucket): Prisma.UserWhereInput => ({
        AND: [ACTIVE_PUBLIC_USER_WHERE, buckets[bucket]],
      });
      const result = await executeRankedPage({
        query,
        count: (bucket) => client.user.count({ where: whereFor(bucket) }),
        fetch: (bucket, skip, take) =>
          client.user.findMany({
            where: whereFor(bucket),
            orderBy: [...entityOrderBy],
            skip,
            take,
            select: DEFAULT_USER_SELECT,
          }),
      });
      return {
        data: result.rows.map((user) => mapPublicUser(user)),
        meta: result.meta,
      };
    },

    searchPosts: async (query, viewer) => {
      const buckets = buildPostBuckets(query);
      const visible = PostVisibilityService.buildVisiblePostWhere(viewer);
      const whereFor = (bucket: TSearchBucket): Prisma.PostWhereInput => ({
        AND: [visible, buckets[bucket]],
      });
      const result = await executeRankedPage({
        query,
        count: (bucket) => client.post.count({ where: whereFor(bucket) }),
        fetch: (bucket, skip, take) =>
          client.post.findMany({
            where: whereFor(bucket),
            orderBy: [...entityOrderBy],
            skip,
            take,
            select: PostSelect.FEED,
          }),
      });
      return {
        data: await postResponseService.enrichPosts(result.rows, viewer),
        meta: result.meta,
      };
    },

    searchCommunities: async (query, viewer) => {
      const buckets = buildCommunityBuckets(query);
      const readable = buildReadableCommunityWhere(viewer);
      const whereFor = (bucket: TSearchBucket): Prisma.CommunityWhereInput => ({
        AND: [readable, buckets[bucket]],
      });
      const result = await executeRankedPage({
        query,
        count: (bucket) => client.community.count({ where: whereFor(bucket) }),
        fetch: (bucket, skip, take) =>
          client.community.findMany({
            where: whereFor(bucket),
            orderBy: [...entityOrderBy],
            skip,
            take,
            select: CommunitySelect.PUBLIC,
          }),
      });
      return {
        data: await communityResponseService.enrichCommunities(
          result.rows,
          viewer,
        ),
        meta: result.meta,
      };
    },

    searchHashtags: async (query, viewer) => {
      const buckets = buildHashtagBuckets(query);
      const visible = PostVisibilityService.buildVisiblePostWhere(viewer);
      const whereFor = (bucket: TSearchBucket): Prisma.HashtagWhereInput => ({
        AND: [buckets[bucket], { posts: { some: { post: { is: visible } } } }],
      });
      const result = await executeRankedPage({
        query,
        count: (bucket) => client.hashtag.count({ where: whereFor(bucket) }),
        fetch: (bucket, skip, take) =>
          client.hashtag.findMany({
            where: whereFor(bucket),
            orderBy: [...entityOrderBy],
            skip,
            take,
            select: { id: true, name: true },
          }),
      });
      if (!result.rows.length) return { data: [], meta: result.meta };

      const counts = await client.postHashtag.groupBy({
        by: ["hashtagId"],
        where: {
          hashtagId: { in: result.rows.map((hashtag) => hashtag.id) },
          post: { is: visible },
        },
        _count: { hashtagId: true },
      });
      const countByHashtagId = new Map(
        counts.map((item) => [item.hashtagId, item._count.hashtagId]),
      );
      const data = result.rows.map((hashtag) => {
        const postCount = countByHashtagId.get(hashtag.id);
        if (postCount === undefined) {
          throw new Error("Search hashtag visible-count invariant failed");
        }
        return { ...hashtag, postCount };
      });
      return { data, meta: result.meta };
    },
  };

  return reader;
};
