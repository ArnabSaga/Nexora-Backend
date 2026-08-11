import { Router } from "express";
import { followMutationRateLimit } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { FollowController } from "./follow.controller";
import { FollowValidation } from "./follow.validation";

const router = Router();

router.get(
  "/suggestions",
  requireAuth,
  validateRequest({ query: FollowValidation.listQuery }),
  FollowController.getSuggestions,
);

router.get(
  "/:userId/followers",
  validateRequest({
    params: FollowValidation.userIdParam,
    query: FollowValidation.listQuery,
  }),
  FollowController.getFollowers,
);

router.get(
  "/:userId/following",
  validateRequest({
    params: FollowValidation.userIdParam,
    query: FollowValidation.listQuery,
  }),
  FollowController.getFollowing,
);

router.post(
  "/:userId/follow",
  requireAuth,
  followMutationRateLimit,
  validateRequest({ params: FollowValidation.userIdParam }),
  FollowController.followUser,
);

router.delete(
  "/:userId/follow",
  requireAuth,
  followMutationRateLimit,
  validateRequest({ params: FollowValidation.userIdParam }),
  FollowController.unfollowUser,
);

export const FollowRoutes = router;
