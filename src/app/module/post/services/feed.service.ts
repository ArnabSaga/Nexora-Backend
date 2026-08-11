import { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";
import { PUBLIC_PROFILE_POST_WHERE } from "../../../shared/constants/post.constant";
import { paginationHelper } from "../../../shared/helpers/paginationHelper";
import { POST_DEFAULT_LIMIT, POST_MAX_LIMIT } from "../constants/post.constant";
import { decodePostCursor, encodePostCursor } from "../utils/cursor.utils";
import { TPostFeedQuery, TPostListQuery } from "../post.interface";
import { PostSelect } from "../constants/post.select";
import { PostVisibilityService } from "./post-visibility.service";
import { PostResponseService } from "./post-response.service";

const getCursorWhere = (cursor?: string): Prisma.PostWhereInput => {
  const decoded = decodePostCursor(cursor);

  if (!decoded) {
    return {};
  }

  const createdAt = new Date(decoded.createdAt);

  return {
    OR: [
      {
        createdAt: {
          lt: createdAt,
        },
      },
      {
        createdAt,
        id: {
          lt: decoded.id,
        },
      },
    ],
  };
};

const getCursorFeed = async (
  where: Prisma.PostWhereInput,
  query: TPostFeedQuery,
  viewer?: Express.AuthenticatedUser,
) => {
  const limit = Math.min(query.limit ?? POST_DEFAULT_LIMIT, POST_MAX_LIMIT);

  const rows = await prisma.post.findMany({
    where: {
      AND: [where, getCursorWhere(query.cursor)],
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    take: limit + 1,
    select: PostSelect.FEED,
  });

  const hasNextPage = rows.length > limit;
  const data = hasNextPage ? rows.slice(0, limit) : rows;
  const last = data[data.length - 1];

  return {
    data: await PostResponseService.enrichPosts(data, viewer),
    meta: {
      nextCursor: last
        ? encodePostCursor({
            createdAt: last.createdAt.toISOString(),
            id: last.id,
          })
        : null,
      hasNextPage,
      limit,
    },
  };
};

const getOffsetList = async (
  where: Prisma.PostWhereInput,
  query: TPostListQuery,
  viewer?: Express.AuthenticatedUser,
) => {
  const pagination = paginationHelper.calculatePagination(query, {
    defaultLimit: POST_DEFAULT_LIMIT,
    maxLimit: POST_MAX_LIMIT,
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });

  const [data, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: PostSelect.FEED,
    }),
    prisma.post.count({
      where,
    }),
  ]);

  return {
    data: await PostResponseService.enrichPosts(data, viewer),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

const getPersonalizedFeed = async (
  viewer: Express.AuthenticatedUser,
  query: TPostFeedQuery,
) => {
  /**
   * MVP authenticated feed: all posts currently visible to the viewer,
   * ordered by recency. Candidate-source ranking comes later.
   */
  return getCursorFeed(
    PostVisibilityService.buildVisiblePostWhere(viewer),
    query,
    viewer,
  );
};

const getPublicFeed = async (query: TPostFeedQuery) => {
  return getCursorFeed(PostVisibilityService.buildPublicOnlyWhere(), query);
};

const getMyPosts = async (
  viewer: Express.AuthenticatedUser,
  query: TPostListQuery,
) => {
  return getOffsetList(
    {
      AND: [
        {
          authorId: viewer.id,
        },
        PostVisibilityService.buildVisiblePostWhere(viewer),
      ],
    },
    query,
    viewer,
  );
};

const getUserPosts = async (userId: string, query: TPostListQuery) => {
  return getOffsetList(
    {
      ...PUBLIC_PROFILE_POST_WHERE,
      authorId: userId,
      author: {
        is: {
          status: "ACTIVE",
          deletedAt: null,
        },
      },
    },
    query,
  );
};

const getCommunityPosts = async (
  communityId: string,
  query: TPostListQuery,
  viewer?: Express.AuthenticatedUser,
) => {
  return getOffsetList(
    {
      communityId,
      ...PostVisibilityService.buildVisiblePostWhere(viewer),
    },
    query,
    viewer,
  );
};

export const FeedService = {
  getPersonalizedFeed,
  getPublicFeed,
  getMyPosts,
  getUserPosts,
  getCommunityPosts,
};
