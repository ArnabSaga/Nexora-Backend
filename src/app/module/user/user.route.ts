import { Router } from "express";
import { UserRole } from "../../../generated/prisma/client";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { validateRole } from "../../middleware/validateRole";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = Router();

router.get(
  "/suggestions",
  requireAuth,
  validateRequest({ query: UserValidation.publicListQuery }),
  UserController.getSuggestions,
);

router.get(
  "/",
  requireAuth,
  validateRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ query: UserValidation.listUsersQuery }),
  UserController.getAllUsers,
);

router.get(
  "/:userId/followers",
  validateRequest({
    params: UserValidation.userIdParam,
    query: UserValidation.publicListQuery,
  }),
  UserController.getFollowers,
);

router.get(
  "/:userId/following",
  validateRequest({
    params: UserValidation.userIdParam,
    query: UserValidation.publicListQuery,
  }),
  UserController.getFollowing,
);

router.post(
  "/:userId/follow",
  requireAuth,
  validateRequest({ params: UserValidation.userIdParam }),
  UserController.followUser,
);

router.delete(
  "/:userId/follow",
  requireAuth,
  validateRequest({ params: UserValidation.userIdParam }),
  UserController.unfollowUser,
);

router.get(
  "/:id",
  requireAuth,
  validateRequest({ params: UserValidation.idParam }),
  UserController.getUserById,
);

router.patch(
  "/:id/role",
  requireAuth,
  validateRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({
    params: UserValidation.idParam,
    body: UserValidation.updateRole,
  }),
  UserController.updateUserRole,
);

router.patch(
  "/:id/status",
  requireAuth,
  validateRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({
    params: UserValidation.idParam,
    body: UserValidation.updateStatus,
  }),
  UserController.updateUserStatus,
);

router.delete(
  "/:id",
  requireAuth,
  validateRole(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest({ params: UserValidation.idParam }),
  UserController.deleteUser,
);

export const UserRoutes = router;
