import type { TMeta } from "../../shared/response/response.types";
import type { TPostResponse } from "../post/post.interface";

export type TTrendingPostQuery = {
  page?: number;
  limit?: number;
};

export type TTrendingHashtagQuery = {
  limit?: number;
};

type TTrendingWindow = {
  windowStart: Date;
  windowEnd: Date;
};

export type TNormalizedTrendingPostQuery = TTrendingWindow & {
  page: number;
  limit: number;
};

export type TNormalizedTrendingHashtagQuery = TTrendingWindow & {
  limit: number;
};

export type TTrendingHashtag = {
  id: string;
  name: string;
  postCount: number;
};

export type TTrendingPostResult = {
  data: TPostResponse[];
  meta: TMeta;
};

export type TTrendingReader = {
  getTrendingPosts(
    query: TNormalizedTrendingPostQuery,
    viewer?: Express.AuthenticatedUser,
  ): Promise<TTrendingPostResult>;
  getTrendingHashtags(
    query: TNormalizedTrendingHashtagQuery,
  ): Promise<TTrendingHashtag[]>;
};

export type TTrendingClock = {
  now(): Date;
};
