import status from "http-status";
import AppError from "../../shared/errors/AppError";
import {
  TRENDING_DEFAULT_LIMIT,
  TRENDING_DEFAULT_PAGE,
  TRENDING_MAX_LIMIT,
  TRENDING_MAX_PAGE,
  TRENDING_WINDOW_MS,
} from "./trending.constant";
import type {
  TNormalizedTrendingHashtagQuery,
  TNormalizedTrendingPostQuery,
  TTrendingClock,
  TTrendingHashtagQuery,
  TTrendingPostQuery,
  TTrendingReader,
} from "./trending.interface";

const validateKeys = (query: object, allowed: string[]) => {
  if (Object.keys(query).some((key) => !allowed.includes(key))) {
    throw new AppError(status.BAD_REQUEST, "Invalid trending query");
  }
};

const validateInteger = (
  value: unknown,
  fallback: number,
  maximum: number,
  label: string,
) => {
  const resolved = value ?? fallback;
  if (
    !Number.isSafeInteger(resolved) ||
    (resolved as number) < 1 ||
    (resolved as number) > maximum
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      `${label} must be between 1 and ${maximum}`,
    );
  }
  return resolved as number;
};

const createWindow = (clock: TTrendingClock) => {
  const now = clock.now();
  const timestamp = now.getTime();
  if (!Number.isFinite(timestamp)) {
    throw new Error("Trending clock returned an invalid date");
  }
  return {
    windowStart: new Date(timestamp - TRENDING_WINDOW_MS),
    windowEnd: new Date(timestamp),
  };
};

export const normalizeTrendingPostQuery = (
  query: TTrendingPostQuery,
  clock: TTrendingClock,
): TNormalizedTrendingPostQuery => {
  validateKeys(query, ["page", "limit"]);
  const page = validateInteger(
    query.page,
    TRENDING_DEFAULT_PAGE,
    TRENDING_MAX_PAGE,
    "Page",
  );
  const limit = validateInteger(
    query.limit,
    TRENDING_DEFAULT_LIMIT,
    TRENDING_MAX_LIMIT,
    "Limit",
  );
  return { page, limit, ...createWindow(clock) };
};

export const normalizeTrendingHashtagQuery = (
  query: TTrendingHashtagQuery,
  clock: TTrendingClock,
): TNormalizedTrendingHashtagQuery => {
  validateKeys(query, ["limit"]);
  const limit = validateInteger(
    query.limit,
    TRENDING_DEFAULT_LIMIT,
    TRENDING_MAX_LIMIT,
    "Limit",
  );
  return { limit, ...createWindow(clock) };
};

export const createTrendingService = (
  reader: TTrendingReader,
  clock: TTrendingClock,
) => ({
  getTrendingPosts: (
    query: TTrendingPostQuery,
    viewer?: Express.AuthenticatedUser,
  ) =>
    reader.getTrendingPosts(normalizeTrendingPostQuery(query, clock), viewer),
  getTrendingHashtags: (query: TTrendingHashtagQuery) =>
    reader.getTrendingHashtags(normalizeTrendingHashtagQuery(query, clock)),
});

export type TTrendingService = ReturnType<typeof createTrendingService>;
