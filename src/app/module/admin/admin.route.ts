import { Router } from "express";
import { UserRole } from "../../../generated/prisma/client";
import { communityMutationRateLimit } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { validateRole } from "../../middleware/validateRole";
import { AdminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

const router = Router();
const adminOnly = validateRole(UserRole.ADMIN, UserRole.SUPER_ADMIN);

router.use(requireAuth, adminOnly);

router.get(
  "/dashboard",
  validateRequest({ query: AdminValidation.emptyQuery }),
  AdminController.getDashboard,
);
router.get(
  "/posts",
  validateRequest({ query: AdminValidation.postList }),
  AdminController.getPosts,
);
router.get(
  "/communities",
  validateRequest({ query: AdminValidation.communityList }),
  AdminController.getCommunities,
);
router.patch(
  "/communities/:id/status",
  communityMutationRateLimit,
  validateRequest({
    params: AdminValidation.communityIdParam,
    body: AdminValidation.communityStatus,
  }),
  AdminController.updateCommunityStatus,
);

export const AdminRoutes = router;
