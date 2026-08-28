export const ADMIN_DEFAULT_PAGE = 1;
export const ADMIN_MAX_PAGE = 10_000;
export const ADMIN_DEFAULT_LIMIT = 20;
export const ADMIN_MAX_LIMIT = 50;
export const ADMIN_MIN_SEARCH_LENGTH = 2;
export const ADMIN_MAX_SEARCH_LENGTH = 100;

export const ADMIN_POST_STATES = ["ACTIVE", "DELETED"] as const;
export const ADMIN_COMMUNITY_STATES = [
  "ACTIVE",
  "SUSPENDED",
  "DELETED",
] as const;
export const ADMIN_COMMUNITY_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
