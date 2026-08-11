export const FOLLOW_DEFAULT_PAGE = 1;
export const FOLLOW_DEFAULT_LIMIT = 10;
export const FOLLOW_MAX_LIMIT = 100;
export const FOLLOW_MAX_PAGE = 10_000;

export const FOLLOW_PAGINATION_CONFIG = {
  defaultPage: FOLLOW_DEFAULT_PAGE,
  defaultLimit: FOLLOW_DEFAULT_LIMIT,
  maxLimit: FOLLOW_MAX_LIMIT,
  defaultSortBy: "createdAt",
  defaultSortOrder: "desc",
} as const;
