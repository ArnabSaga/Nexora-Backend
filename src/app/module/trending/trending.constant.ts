export const TRENDING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const TRENDING_DEFAULT_PAGE = 1;
export const TRENDING_MAX_PAGE = 10_000;
export const TRENDING_DEFAULT_LIMIT = 10;
export const TRENDING_MAX_LIMIT = 50;

export const TRENDING_POST_ORDER_BY = [
  { reactions: { _count: "desc" } },
  { comments: { _count: "desc" } },
  { reposts: { _count: "desc" } },
  { votes: { _count: "desc" } },
  { createdAt: "desc" },
  { id: "desc" },
] as const;
