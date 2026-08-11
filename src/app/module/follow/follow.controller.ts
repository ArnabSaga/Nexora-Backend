import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { FollowService } from "./follow.service";

const getSuggestions = catchAsync(async (req, res) => {
  const result = await FollowService.getSuggestions(req.user!, req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User suggestions retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getFollowers = catchAsync(async (req, res) => {
  const result = await FollowService.getFollowers(
    req.params.userId as string,
    req.query,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Followers retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getFollowing = catchAsync(async (req, res) => {
  const result = await FollowService.getFollowing(
    req.params.userId as string,
    req.query,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Following users retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const followUser = catchAsync(async (req, res) => {
  const result = await FollowService.followUser(
    req.params.userId as string,
    req.user!,
  );

  sendResponse(res, {
    statusCode: result.statusCode,
    success: true,
    message: result.message,
    data: result.data,
  });
});

const unfollowUser = catchAsync(async (req, res) => {
  const result = await FollowService.unfollowUser(
    req.params.userId as string,
    req.user!,
  );

  sendResponse(res, {
    statusCode: result.statusCode,
    success: true,
    message: result.message,
    data: result.data,
  });
});

export const FollowController = {
  getSuggestions,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
};
