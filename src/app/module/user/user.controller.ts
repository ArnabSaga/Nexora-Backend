import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { FollowService } from "./follow.service";
import { UserService } from "./user.service";

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

const getAllUsers = catchAsync(async (req, res) => {
  const result = await UserService.getAllUsers(req.query);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Users retrieved successfully",
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

const getUserById = catchAsync(async (req, res) => {
  const user = await UserService.getUserById(
    req.params.id as string,
    req.user!,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User retrieved successfully",
    data: user,
  });
});

const updateUserRole = catchAsync(async (req, res) => {
  const user = await UserService.updateUserRole(
    req.params.id as string,
    req.body,
    req.user!,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User role updated successfully",
    data: user,
  });
});

const updateUserStatus = catchAsync(async (req, res) => {
  const user = await UserService.updateUserStatus(
    req.params.id as string,
    req.body,
    req.user!,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User status updated successfully",
    data: user,
  });
});

const deleteUser = catchAsync(async (req, res) => {
  const user = await UserService.deleteUser(req.params.id as string, req.user!);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User deleted successfully",
    data: user,
  });
});

export const UserController = {
  getSuggestions,
  getAllUsers,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
};
