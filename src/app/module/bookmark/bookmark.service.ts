import status from "http-status";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import { isUniqueConstraintOn } from "../../shared/helpers/prismaUnique";
import { PostSelect } from "../post/constants/post.select";
import { PostResponseService } from "../post/services/post-response.service";
import { PostVisibilityService } from "../post/services/post-visibility.service";
import {
  BOOKMARK_DEFAULT_LIMIT,
  BOOKMARK_MAX_LIMIT,
} from "./bookmark.constant";
import { decodeBookmarkCursor, encodeBookmarkCursor } from "./bookmark.cursor";
import type {
  TBookmarkActionResult,
  TBookmarkListQuery,
  TBookmarkListResult,
} from "./bookmark.interface";
import { createBookmarkSaveService } from "./bookmark-save.factory";

const validateLimit = (limit?: number) => {
  const resolved = limit ?? BOOKMARK_DEFAULT_LIMIT;

  if (
    !Number.isSafeInteger(resolved) ||
    resolved < 1 ||
    resolved > BOOKMARK_MAX_LIMIT
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      `Limit must be between 1 and ${BOOKMARK_MAX_LIMIT}`,
    );
  }

  return resolved;
};

const BookmarkSaveService = createBookmarkSaveService({
  findVisiblePost: (postId, requester) =>
    prisma.post.findFirst({
      where: {
        id: postId,
        ...PostVisibilityService.buildVisiblePostWhere(requester),
      },
      select: { id: true },
    }),
  createBookmark: (userId, postId) =>
    prisma.bookmark.create({
      data: {
        userId,
        postId,
      },
    }),
  isDuplicateBookmarkError: (error) =>
    isUniqueConstraintOn(error, ["userId", "postId"]),
});

const removeBookmark = async (
  postId: string,
  requester: Express.AuthenticatedUser,
): Promise<TBookmarkActionResult> => {
  await prisma.bookmark.deleteMany({
    where: {
      userId: requester.id,
      postId,
    },
  });

  return {
    statusCode: status.OK,
    message: "Bookmark removed successfully",
    data: { bookmarked: false },
  };
};

const getBookmarks = async (
  requester: Express.AuthenticatedUser,
  query: TBookmarkListQuery,
): Promise<TBookmarkListResult> => {
  const limit = validateLimit(query.limit);
  const cursor = decodeBookmarkCursor(query.cursor);
  const rows = await prisma.bookmark.findMany({
    where: {
      userId: requester.id,
      post: {
        is: PostVisibilityService.buildVisiblePostWhere(requester),
      },
      ...(cursor && {
        OR: [
          { createdAt: { lt: new Date(cursor.createdAt) } },
          {
            createdAt: new Date(cursor.createdAt),
            id: { lt: cursor.id },
          },
        ],
      }),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      createdAt: true,
      post: {
        select: PostSelect.FEED,
      },
    },
  });
  const hasNextPage = rows.length > limit;
  const returned = hasNextPage ? rows.slice(0, limit) : rows;
  const last = returned.at(-1);

  return {
    data: await PostResponseService.enrichPosts(
      returned.map((bookmark) => bookmark.post),
      requester,
    ),
    meta: {
      nextCursor: last
        ? encodeBookmarkCursor({
            createdAt: last.createdAt.toISOString(),
            id: last.id,
          })
        : null,
      hasNextPage,
      limit,
    },
  };
};

export const BookmarkService = {
  saveBookmark: BookmarkSaveService.saveBookmark,
  removeBookmark,
  getBookmarks,
};
