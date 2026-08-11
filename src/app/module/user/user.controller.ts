import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { UserService } from "./user.service";

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
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
};
