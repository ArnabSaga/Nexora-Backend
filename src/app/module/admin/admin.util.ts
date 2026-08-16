import status from "http-status";
import {
  CommunityVisibility,
  PostVisibility,
} from "../../../generated/prisma/client";
import AppError from "../../shared/errors/AppError";
import { escapeLikePattern } from "../../shared/helpers/escapeLikePattern";
import {
  ADMIN_COMMUNITY_STATES,
  ADMIN_COMMUNITY_STATUSES,
  ADMIN_DEFAULT_LIMIT,
  ADMIN_DEFAULT_PAGE,
  ADMIN_MAX_LIMIT,
  ADMIN_MAX_PAGE,
  ADMIN_MAX_SEARCH_LENGTH,
  ADMIN_MIN_SEARCH_LENGTH,
  ADMIN_POST_STATES,
} from "./admin.constant";
import type {
  TAdminCommunityQuery,
  TAdminCommunityStatus,
  TAdminPostQuery,
  TNormalizedAdminCommunityQuery,
  TNormalizedAdminPostQuery,
} from "./admin.interface";

const CUID_PATTERN = /^[cC][0-9a-z]{6,}$/;

const asRecord = (input: unknown) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError(status.BAD_REQUEST, "Invalid Admin query");
  }
  return input as Record<string, unknown>;
};

const assertKeys = (query: Record<string, unknown>, allowed: string[]) => {
  if (Object.keys(query).some((key) => !allowed.includes(key))) {
    throw new AppError(status.BAD_REQUEST, "Invalid Admin query");
  }
};

const integer = (value: unknown, fallback: number, max: number) => {
  const resolved = value ?? fallback;
  if (
    !Number.isSafeInteger(resolved) ||
    (resolved as number) < 1 ||
    (resolved as number) > max
  ) {
    throw new AppError(status.BAD_REQUEST, "Invalid Admin pagination");
  }
  return resolved as number;
};

const optionalString = (value: unknown, name: string) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new AppError(status.BAD_REQUEST, `Invalid ${name}`);
  }
  return value;
};

const optionalCuid = (value: unknown, name: string) => {
  const resolved = optionalString(value, name);
  if (resolved !== undefined && !CUID_PATTERN.test(resolved)) {
    throw new AppError(status.BAD_REQUEST, `Invalid ${name}`);
  }
  return resolved;
};

const normalizedSearch = (value: unknown) => {
  const raw = optionalString(value, "search term");
  if (raw === undefined) return {};
  const normalized = raw.trim();
  if (
    normalized.length < ADMIN_MIN_SEARCH_LENGTH ||
    normalized.length > ADMIN_MAX_SEARCH_LENGTH
  ) {
    throw new AppError(status.BAD_REQUEST, "Invalid Admin search term");
  }
  return {
    searchTerm: normalized,
    patternSearchTerm: escapeLikePattern(normalized),
  };
};

const enumValue = <T extends string>(
  value: unknown,
  values: readonly T[],
  name: string,
) => {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new AppError(status.BAD_REQUEST, `Invalid ${name}`);
  }
  return value as T;
};

export const normalizeAdminPostQuery = (
  input: unknown,
): TNormalizedAdminPostQuery => {
  const query = asRecord(input);
  assertKeys(query, [
    "page",
    "limit",
    "searchTerm",
    "authorId",
    "communityId",
    "visibility",
    "state",
  ]);
  return {
    page: integer(query.page, ADMIN_DEFAULT_PAGE, ADMIN_MAX_PAGE),
    limit: integer(query.limit, ADMIN_DEFAULT_LIMIT, ADMIN_MAX_LIMIT),
    ...normalizedSearch(query.searchTerm),
    ...(optionalCuid(query.authorId, "author id") && {
      authorId: query.authorId as string,
    }),
    ...(optionalCuid(query.communityId, "community id") && {
      communityId: query.communityId as string,
    }),
    ...(enumValue(
      query.visibility,
      Object.values(PostVisibility),
      "visibility",
    ) && {
      visibility: query.visibility as PostVisibility,
    }),
    ...(enumValue(query.state, ADMIN_POST_STATES, "Post state") && {
      state: query.state as TAdminPostQuery["state"],
    }),
  };
};

export const normalizeAdminCommunityQuery = (
  input: unknown,
): TNormalizedAdminCommunityQuery => {
  const query = asRecord(input);
  assertKeys(query, [
    "page",
    "limit",
    "searchTerm",
    "ownerId",
    "visibility",
    "state",
  ]);
  return {
    page: integer(query.page, ADMIN_DEFAULT_PAGE, ADMIN_MAX_PAGE),
    limit: integer(query.limit, ADMIN_DEFAULT_LIMIT, ADMIN_MAX_LIMIT),
    ...normalizedSearch(query.searchTerm),
    ...(optionalCuid(query.ownerId, "owner id") && {
      ownerId: query.ownerId as string,
    }),
    ...(enumValue(
      query.visibility,
      Object.values(CommunityVisibility),
      "visibility",
    ) && { visibility: query.visibility as CommunityVisibility }),
    ...(enumValue(query.state, ADMIN_COMMUNITY_STATES, "Community state") && {
      state: query.state as TAdminCommunityQuery["state"],
    }),
  };
};

export const normalizeAdminCommunityStatus = (
  value: unknown,
): TAdminCommunityStatus => {
  const statusValue = enumValue(
    value,
    ADMIN_COMMUNITY_STATUSES,
    "Community status",
  );
  if (!statusValue) {
    throw new AppError(status.BAD_REQUEST, "Invalid Community status");
  }
  return statusValue;
};

export const normalizeAdminCommunityId = (value: unknown): string => {
  if (typeof value !== "string" || !CUID_PATTERN.test(value)) {
    throw new AppError(status.BAD_REQUEST, "Invalid Community id");
  }
  return value;
};
