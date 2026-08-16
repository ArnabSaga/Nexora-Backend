import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import type { TSearchQuery } from "./search.interface";
import { SearchService } from "./search.service";

const search = catchAsync(async (req, res) => {
  const data = await SearchService.search(
    req.query as unknown as TSearchQuery,
    req.user,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Search results retrieved successfully",
    data,
  });
});

const searchUsers = catchAsync(async (req, res) => {
  const result = await SearchService.searchUsers(
    req.query as unknown as TSearchQuery,
    req.user,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Users retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const searchPosts = catchAsync(async (req, res) => {
  const result = await SearchService.searchPosts(
    req.query as unknown as TSearchQuery,
    req.user,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Posts retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const searchCommunities = catchAsync(async (req, res) => {
  const result = await SearchService.searchCommunities(
    req.query as unknown as TSearchQuery,
    req.user,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Communities retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const SearchController = {
  search,
  searchUsers,
  searchPosts,
  searchCommunities,
};
