import { Router } from "express";
import { optionalAuth } from "../../middleware/optionalAuth";
import { communityMutationRateLimit } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { CommunityController } from "./community.controller";
import { CommunityValidation } from "./community.validation";

const router = Router();

router.post(
  "/",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({ body: CommunityValidation.create }),
  CommunityController.createCommunity,
);

router.get(
  "/",
  optionalAuth,
  validateRequest({ query: CommunityValidation.listQuery }),
  CommunityController.getCommunities,
);

router.patch(
  "/:communityId/members/:userId/role",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({
    params: CommunityValidation.memberParam,
    body: CommunityValidation.updateRole,
  }),
  CommunityController.updateMemberRole,
);

router.patch(
  "/:communityId/members/:userId/status",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({
    params: CommunityValidation.memberParam,
    body: CommunityValidation.updateStatus,
  }),
  CommunityController.updateMemberStatus,
);

router.delete(
  "/:communityId/members/:userId",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({ params: CommunityValidation.memberParam }),
  CommunityController.removeCommunityMember,
);

router.post(
  "/:id/join",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({ params: CommunityValidation.idParam }),
  CommunityController.joinCommunity,
);

router.delete(
  "/:id/leave",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({ params: CommunityValidation.idParam }),
  CommunityController.leaveCommunity,
);

router.get(
  "/:id/members",
  optionalAuth,
  validateRequest({
    params: CommunityValidation.idParam,
    query: CommunityValidation.memberListQuery,
  }),
  CommunityController.getCommunityMembers,
);

router.patch(
  "/:id",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({
    params: CommunityValidation.idParam,
    body: CommunityValidation.update,
  }),
  CommunityController.updateCommunity,
);

router.delete(
  "/:id",
  requireAuth,
  communityMutationRateLimit,
  validateRequest({ params: CommunityValidation.idParam }),
  CommunityController.deleteCommunity,
);

router.get(
  "/:slug",
  optionalAuth,
  validateRequest({ params: CommunityValidation.slugParam }),
  CommunityController.getCommunityBySlug,
);

export const CommunityRoutes = router;
