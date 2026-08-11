import { Router } from "express";
import { optionalAuth } from "../../middleware/optionalAuth";
import { communityMutationRateLimit } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CommunityMemberController } from "./community-member.controller";
import { CommunityMemberValidation } from "./community-member.validation";

const router = Router();

router.patch(
  "/:communityId/members/:userId/role",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({
    params: CommunityMemberValidation.memberParam,
    body: CommunityMemberValidation.updateRole,
  }),
  CommunityMemberController.updateMemberRole,
);

router.patch(
  "/:communityId/members/:userId/status",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({
    params: CommunityMemberValidation.memberParam,
    body: CommunityMemberValidation.updateStatus,
  }),
  CommunityMemberController.updateMemberStatus,
);

router.delete(
  "/:communityId/members/:userId",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({ params: CommunityMemberValidation.memberParam }),
  CommunityMemberController.removeCommunityMember,
);

router.post(
  "/:id/join",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({ params: CommunityMemberValidation.idParam }),
  CommunityMemberController.joinCommunity,
);

router.delete(
  "/:id/leave",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({ params: CommunityMemberValidation.idParam }),
  CommunityMemberController.leaveCommunity,
);

router.get(
  "/:id/members",
  optionalAuth,
  validateRequest({
    params: CommunityMemberValidation.idParam,
    query: CommunityMemberValidation.memberListQuery,
  }),
  CommunityMemberController.getCommunityMembers,
);

export const CommunityMemberRoutes = router;
