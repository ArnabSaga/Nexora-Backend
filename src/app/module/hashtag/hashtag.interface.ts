import type { TPostResponse } from "../post/post.interface";

export type THashtagTrendingQuery = { limit?: number };
export type THashtagPostQuery = { cursor?: string; limit?: number };

export type THashtagCursorPayload = {
  version: 1;
  createdAt: string;
  id: string;
};

export type TTrendingHashtag = {
  id: string;
  name: string;
  postCount: number;
};

export type THashtagPostListResult = {
  data: TPostResponse[];
  meta: {
    nextCursor: string | null;
    hasNextPage: boolean;
    limit: number;
  };
};
