import type { TPostResponse } from "../post/post.interface";

export type TBookmarkListQuery = {
  cursor?: string;
  limit?: number;
};

export type TBookmarkCursorPayload = {
  version: 1;
  createdAt: string;
  id: string;
};

export type TBookmarkActionResult = {
  statusCode: number;
  message: string;
  data: {
    bookmarked: boolean;
  };
};

export type TBookmarkListResult = {
  data: TPostResponse[];
  meta: {
    nextCursor: string | null;
    hasNextPage: boolean;
    limit: number;
  };
};
