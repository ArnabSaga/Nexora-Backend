import { Router } from "express";
import multer from "multer";
import { profileMediaMutationRateLimit } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { UPLOAD_MAX_FILE_SIZE } from "../upload";
import { ProfileController } from "./profile.controller";
import { ProfileValidation } from "./profile.validation";

const profileIdentityRouter = Router();

const profileMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD_MAX_FILE_SIZE,
    files: 1,
  },
});

profileIdentityRouter.get("/me", requireAuth, ProfileController.getMyProfile);

profileIdentityRouter.patch(
  "/me",
  requireAuth,
  validateRequest({ body: ProfileValidation.updateProfile }),
  ProfileController.updateMyProfile,
);

profileIdentityRouter.patch(
  "/me/avatar",
  requireAuth,
  profileMediaMutationRateLimit,
  profileMediaUpload.single("file"),
  ProfileController.updateAvatar,
);

profileIdentityRouter.patch(
  "/me/cover",
  requireAuth,
  profileMediaMutationRateLimit,
  profileMediaUpload.single("file"),
  ProfileController.updateCover,
);

profileIdentityRouter.get(
  "/:username",
  validateRequest({ params: ProfileValidation.usernameParam }),
  ProfileController.getPublicProfile,
);

export const ProfileIdentityRoutes = profileIdentityRouter;
