import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { CommunityMemberService } from "./community-member.service";

const joinCommunity = catchAsync(async (req, res) => {
  const result = await CommunityMemberService.joinCommunity(
    req.params.id as string,
    req.user!,
  );
  sendResponse(res, {
    statusCode: result.statusCode,
    success: true,
    message: result.message,
    data: result.data,
  });
});

const leaveCommunity = catchAsync(async (req, res) => {
  await CommunityMemberService.leaveCommunity(
    req.params.id as string,
    req.user!,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Community left successfully",
    data: null,
  });
});

const getCommunityMembers = catchAsync(async (req, res) => {
  const result = await CommunityMemberService.getCommunityMembers(
    req.params.id as string,
    req.query,
    req.user,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Community members retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const updateMemberRole = catchAsync(async (req, res) => {
  const data = await CommunityMemberService.updateMemberRole(
    req.params.communityId as string,
    req.params.userId as string,
    req.user!,
    req.body,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Community member role updated successfully",
    data,
  });
});

const updateMemberStatus = catchAsync(async (req, res) => {
  const data = await CommunityMemberService.updateMemberStatus(
    req.params.communityId as string,
    req.params.userId as string,
    req.user!,
    req.body,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Community member status updated successfully",
    data,
  });
});

const removeCommunityMember = catchAsync(async (req, res) => {
  await CommunityMemberService.removeCommunityMember(
    req.params.communityId as string,
    req.params.userId as string,
    req.user!,
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Community member removed successfully",
    data: null,
  });
});

export const CommunityMemberController = {
  joinCommunity,
  leaveCommunity,
  getCommunityMembers,
  updateMemberRole,
  updateMemberStatus,
  removeCommunityMember,
};
