import { Router } from "express";
import { optionalAuth } from "../../middleware/optionalAuth";
import { communityMutationRateLimit } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CommunityRuleController } from "./community-rule.controller";
import { CommunityRuleValidation } from "./community-rule.validation";

const nestedRouter = Router();
const ruleRouter = Router();

nestedRouter.post(
  "/:communityId/rules",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({
    params: CommunityRuleValidation.communityIdParam,
    body: CommunityRuleValidation.create,
  }),
  CommunityRuleController.createCommunityRule,
);

nestedRouter.get(
  "/:communityId/rules",
  optionalAuth,
  validateRequest({
    params: CommunityRuleValidation.communityIdParam,
    query: CommunityRuleValidation.emptyQuery,
  }),
  CommunityRuleController.getCommunityRules,
);

ruleRouter.patch(
  "/:ruleId",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({
    params: CommunityRuleValidation.ruleIdParam,
    body: CommunityRuleValidation.update,
  }),
  CommunityRuleController.updateCommunityRule,
);

ruleRouter.delete(
  "/:ruleId",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({ params: CommunityRuleValidation.ruleIdParam }),
  CommunityRuleController.deleteCommunityRule,
);

export const CommunityNestedRuleRoutes = nestedRouter;
export const CommunityRuleRoutes = ruleRouter;
