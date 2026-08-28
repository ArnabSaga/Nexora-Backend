import type { TPostResponse } from "../post/post.interface";
import type { TTrendingHashtag } from "../trending";

export type { TTrendingHashtag } from "../trending";

export type THashtagTrendingQuery = { limit?: number };
export type THashtagPostQuery = { cursor?: string; limit?: number };

export type THashtagCursorPayload = {
  version: 1;
  createdAt: string;
  id: string;
};

export type THashtagPostListResult = {
  data: TPostResponse[];
  meta: {
    nextCursor: string | null;
    hasNextPage: boolean;
    limit: number;
  };
};
