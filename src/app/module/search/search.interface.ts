import type { TCommunityResponse } from "../community/community.interface";
import type { TPostResponse } from "../post/post.interface";
import type { TPublicUser } from "../user/user.interface";
import type { TMeta } from "../../shared/response/response.types";
import type { SEARCH_TYPES } from "./search.constant";

export type TSearchType = (typeof SEARCH_TYPES)[number];

export type TSearchQuery = {
  query: string;
  type?: TSearchType;
  page?: number;
  limit?: number;
};

export type TNormalizedSearchQuery = {
  normalizedQuery: string;
  patternQuery: string;
  page: number;
  limit: number;
};

export type TSearchSection<T> = { data: T[]; meta: TMeta };

export type TSearchHashtag = {
  id: string;
  name: string;
  postCount: number;
};

export type TSearchUsersSection = TSearchSection<TPublicUser>;
export type TSearchPostsSection = TSearchSection<TPostResponse>;
export type TSearchCommunitiesSection = TSearchSection<TCommunityResponse>;
export type TSearchHashtagsSection = TSearchSection<TSearchHashtag>;

export type TGlobalSearchResult = {
  users: TSearchUsersSection;
  posts: TSearchPostsSection;
  communities: TSearchCommunitiesSection;
  hashtags: TSearchHashtagsSection;
};

export type TTypedGlobalSearchResult =
  | { users: TSearchUsersSection }
  | { posts: TSearchPostsSection }
  | { communities: TSearchCommunitiesSection }
  | { hashtags: TSearchHashtagsSection };

export type TSearchBucket = "exact" | "prefix" | "contains";
export type TSearchBucketCounts = Record<TSearchBucket, number>;

export type TSearchBucketSlice = {
  bucket: TSearchBucket;
  skip: number;
  take: number;
};

export type TSearchReader = {
  searchUsers(
    query: TNormalizedSearchQuery,
    viewer?: Express.AuthenticatedUser,
  ): Promise<TSearchUsersSection>;
  searchPosts(
    query: TNormalizedSearchQuery,
    viewer?: Express.AuthenticatedUser,
  ): Promise<TSearchPostsSection>;
  searchCommunities(
    query: TNormalizedSearchQuery,
    viewer?: Express.AuthenticatedUser,
  ): Promise<TSearchCommunitiesSection>;
  searchHashtags(
    query: TNormalizedSearchQuery,
    viewer?: Express.AuthenticatedUser,
  ): Promise<TSearchHashtagsSection>;
};
