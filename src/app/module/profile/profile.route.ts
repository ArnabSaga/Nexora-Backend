import { Router } from "express";
import multer from "multer";
import {
  imageFileFilter,
  profileAvatarStorage,
  profileCoverStorage,
} from "../../lib/cloudinary";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { FILE_UPLOAD } from "../../shared/constants/upload.constant";
import { EducationRoutes } from "../education/education.route";
import { ExperienceRoutes } from "../experience/experience.route";
import { SkillRoutes } from "../skill/skill.route";
import { ProfileController } from "./profile.controller";
import { ProfileValidation } from "./profile.validation";

const profileIdentityRouter = Router();
const professionalProfileRouter = Router();

const avatarUpload = multer({
  storage: profileAvatarStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: FILE_UPLOAD.MAX_FILE_SIZE,
  },
});

const coverUpload = multer({
  storage: profileCoverStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: FILE_UPLOAD.MAX_FILE_SIZE,
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
  avatarUpload.single("file"),
  ProfileController.updateAvatar,
);

profileIdentityRouter.patch(
  "/me/cover",
  requireAuth,
  coverUpload.single("file"),
  ProfileController.updateCover,
);

profileIdentityRouter.get(
  "/:username",
  validateRequest({ params: ProfileValidation.usernameParam }),
  ProfileController.getPublicProfile,
);

professionalProfileRouter.use("/experience", ExperienceRoutes);
professionalProfileRouter.use("/education", EducationRoutes);
professionalProfileRouter.use("/skills", SkillRoutes);

export const ProfileIdentityRoutes = profileIdentityRouter;
export const ProfessionalProfileRoutes = professionalProfileRouter;
