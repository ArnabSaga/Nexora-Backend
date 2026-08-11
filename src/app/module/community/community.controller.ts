import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { CommunityService } from "./community.service";

const createCommunity = catchAsync(async (req, res) => {
  const data = await CommunityService.createCommunity(req.user!, req.body);
  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Community created successfully",
    data,
  });
});

const getCommunities = catchAsync(async (req, res) => {
  const result = await CommunityService.getCommunities(req.query, req.user);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Communities retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getCommunityBySlug = catchAsync(async (req, res) => {
  const data = await CommunityService.getCommunityBySlug(
    req.params.slug as string,
    req.user,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Community retrieved successfully",
    data,
  });
});

const updateCommunity = catchAsync(async (req, res) => {
  const data = await CommunityService.updateCommunity(
    req.params.id as string,
    req.user!,
    req.body,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Community updated successfully",
    data,
  });
});

const deleteCommunity = catchAsync(async (req, res) => {
  await CommunityService.deleteCommunity(req.params.id as string, req.user!);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Community deleted successfully",
    data: null,
  });
});

export const CommunityController = {
  createCommunity,
  getCommunities,
  getCommunityBySlug,
  updateCommunity,
  deleteCommunity,
};
