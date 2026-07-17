import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { ProfileService } from "./profile.service";
import { ProfileMediaService } from "./profileMedia.service";

const getMyProfile = catchAsync(async (req, res) => {
  const result = await ProfileService.getOwnProfile(req.user!.id);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req, res) => {
  const result = await ProfileService.updateMyProfile(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const updateAvatar = catchAsync(async (req, res) => {
  const result = await ProfileMediaService.updateAvatar(req.user!.id, req.file);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Profile avatar updated successfully",
    data: result,
  });
});

const updateCover = catchAsync(async (req, res) => {
  const result = await ProfileMediaService.updateCover(req.user!.id, req.file);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Profile cover updated successfully",
    data: result,
  });
});

const getPublicProfile = catchAsync(async (req, res) => {
  const result = await ProfileService.getPublicProfile(
    req.params.username as string,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Public profile retrieved successfully",
    data: result,
  });
});

export const ProfileController = {
  getMyProfile,
  updateMyProfile,
  updateAvatar,
  updateCover,
  getPublicProfile,
};
