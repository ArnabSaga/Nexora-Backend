import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { CommunityRuleService } from "./community-rule.service";

const createCommunityRule = catchAsync(async (req, res) => {
  const data = await CommunityRuleService.createCommunityRule(
    req.params.communityId as string,
    req.user!,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Community rule created successfully",
    data,
  });
});

const getCommunityRules = catchAsync(async (req, res) => {
  const data = await CommunityRuleService.getCommunityRules(
    req.params.communityId as string,
    req.user,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Community rules retrieved successfully",
    data,
  });
});

const updateCommunityRule = catchAsync(async (req, res) => {
  const data = await CommunityRuleService.updateCommunityRule(
    req.params.ruleId as string,
    req.user!,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Community rule updated successfully",
    data,
  });
});

const deleteCommunityRule = catchAsync(async (req, res) => {
  await CommunityRuleService.deleteCommunityRule(
    req.params.ruleId as string,
    req.user!,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Community rule deleted successfully",
    data: null,
  });
});

export const CommunityRuleController = {
  createCommunityRule,
  getCommunityRules,
  updateCommunityRule,
  deleteCommunityRule,
};
