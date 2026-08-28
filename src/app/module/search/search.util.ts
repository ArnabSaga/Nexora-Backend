import status from "http-status";
import AppError from "../../shared/errors/AppError";
import { escapeLikePattern } from "../../shared/helpers/escapeLikePattern";
import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_DEFAULT_PAGE,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_PAGE,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_TYPES,
} from "./search.constant";
import type { TNormalizedSearchQuery, TSearchType } from "./search.interface";

export { escapeLikePattern } from "../../shared/helpers/escapeLikePattern";

const isSearchType = (value: unknown): value is TSearchType =>
  typeof value === "string" && SEARCH_TYPES.includes(value as TSearchType);

const validateInteger = (
  value: unknown,
  name: string,
  min: number,
  max: number,
) => {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < min ||
    (value as number) > max
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      `${name} must be between ${min} and ${max}`,
    );
  }
  return value as number;
};

export const normalizeSearchQuery = (
  input: unknown,
  options: { allowType: boolean },
): TNormalizedSearchQuery & { type?: TSearchType } => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(status.BAD_REQUEST, "Invalid search query");
  }

  const query = input as Record<string, unknown>;
  const allowed = options.allowType
    ? ["query", "type", "page", "limit"]
    : ["query", "page", "limit"];
  if (Object.keys(query).some((key) => !allowed.includes(key))) {
    throw new AppError(status.BAD_REQUEST, "Invalid search query");
  }

  if (typeof query.query !== "string") {
    throw new AppError(status.BAD_REQUEST, "Search query must be a string");
  }
  const normalizedQuery = query.query.trim();
  if (
    normalizedQuery.length < SEARCH_MIN_QUERY_LENGTH ||
    normalizedQuery.length > SEARCH_MAX_QUERY_LENGTH
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      `Search query must be between ${SEARCH_MIN_QUERY_LENGTH} and ${SEARCH_MAX_QUERY_LENGTH} characters`,
    );
  }

  if (query.type !== undefined && !isSearchType(query.type)) {
    throw new AppError(status.BAD_REQUEST, "Invalid search type");
  }

  const page = validateInteger(
    query.page ?? SEARCH_DEFAULT_PAGE,
    "Page",
    1,
    SEARCH_MAX_PAGE,
  );
  const limit = validateInteger(
    query.limit ?? SEARCH_DEFAULT_LIMIT,
    "Limit",
    1,
    SEARCH_MAX_LIMIT,
  );

  return {
    normalizedQuery,
    patternQuery: escapeLikePattern(normalizedQuery),
    page,
    limit,
    ...(query.type !== undefined && { type: query.type }),
  };
};
