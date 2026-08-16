export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_MAX_QUERY_LENGTH = 100;
export const SEARCH_DEFAULT_PAGE = 1;
export const SEARCH_MAX_PAGE = 10_000;
export const SEARCH_DEFAULT_LIMIT = 10;
export const SEARCH_MAX_LIMIT = 50;

export const SEARCH_TYPES = ["USER", "POST", "COMMUNITY", "HASHTAG"] as const;

export const SearchType = {
  USER: "USER",
  POST: "POST",
  COMMUNITY: "COMMUNITY",
  HASHTAG: "HASHTAG",
} as const;
