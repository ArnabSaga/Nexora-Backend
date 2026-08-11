import status from "http-status";
import AppError from "../../shared/errors/AppError";
import { paginationHelper } from "../../shared/helpers/paginationHelper";
import {
  COMMUNITY_DEFAULT_LIMIT,
  COMMUNITY_DEFAULT_PAGE,
  COMMUNITY_MAX_LIMIT,
  COMMUNITY_MAX_PAGE,
  COMMUNITY_PAGINATION_CONFIG,
} from "./community.constant";

export type TCommunityPaginationQuery = {
  page?: number;
  limit?: number;
};

export const calculateCommunityPagination = (
  query: TCommunityPaginationQuery,
) => {
  const page = query.page ?? COMMUNITY_DEFAULT_PAGE;
  const limit = query.limit ?? COMMUNITY_DEFAULT_LIMIT;

  if (!Number.isSafeInteger(page) || page < 1 || page > COMMUNITY_MAX_PAGE) {
    throw new AppError(
      status.BAD_REQUEST,
      `Page must be between 1 and ${COMMUNITY_MAX_PAGE}`,
    );
  }

  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > COMMUNITY_MAX_LIMIT
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      `Limit must be between 1 and ${COMMUNITY_MAX_LIMIT}`,
    );
  }

  const pagination = paginationHelper.calculatePagination(
    query,
    COMMUNITY_PAGINATION_CONFIG,
  );

  return {
    page: pagination.page,
    limit: pagination.limit,
    skip: pagination.skip,
    take: pagination.limit,
  };
};
