import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { AdminService } from "./admin.service";

const getDashboard = catchAsync(async (_req, res) => {
  const data = await AdminService.getDashboard();
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Admin dashboard retrieved successfully",
    data,
  });
});

const getPosts = catchAsync(async (req, res) => {
  const result = await AdminService.getPosts(req.query);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Admin Post inventory retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getCommunities = catchAsync(async (req, res) => {
  const result = await AdminService.getCommunities(req.query);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Admin Community inventory retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const updateCommunityStatus = catchAsync(async (req, res) => {
  const data = await AdminService.updateCommunityStatus(
    req.params.id as string,
    req.body.status,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Community status updated successfully",
    data,
  });
});

export const AdminController = {
  getDashboard,
  getPosts,
  getCommunities,
  updateCommunityStatus,
};
