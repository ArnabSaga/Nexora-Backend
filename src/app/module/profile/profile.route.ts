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

professionalProfileRouter.post(
  "/experience",
  requireAuth,
  validateRequest({ body: ProfileValidation.createExperience }),
  ProfileController.createExperience,
);

professionalProfileRouter.get(
  "/experience",
  requireAuth,
  ProfileController.getMyExperiences,
);

professionalProfileRouter.patch(
  "/experience/:id",
  requireAuth,
  validateRequest({
    params: ProfileValidation.idParam,
    body: ProfileValidation.updateExperience,
  }),
  ProfileController.updateExperience,
);

professionalProfileRouter.delete(
  "/experience/:id",
  requireAuth,
  validateRequest({ params: ProfileValidation.idParam }),
  ProfileController.deleteExperience,
);

professionalProfileRouter.post(
  "/education",
  requireAuth,
  validateRequest({ body: ProfileValidation.createEducation }),
  ProfileController.createEducation,
);

professionalProfileRouter.get(
  "/education",
  requireAuth,
  ProfileController.getMyEducation,
);

professionalProfileRouter.patch(
  "/education/:id",
  requireAuth,
  validateRequest({
    params: ProfileValidation.idParam,
    body: ProfileValidation.updateEducation,
  }),
  ProfileController.updateEducation,
);

professionalProfileRouter.delete(
  "/education/:id",
  requireAuth,
  validateRequest({ params: ProfileValidation.idParam }),
  ProfileController.deleteEducation,
);

professionalProfileRouter.post(
  "/skills",
  requireAuth,
  validateRequest({ body: ProfileValidation.createSkill }),
  ProfileController.addSkill,
);

professionalProfileRouter.get(
  "/skills",
  requireAuth,
  ProfileController.getMySkills,
);

professionalProfileRouter.delete(
  "/skills/:id",
  requireAuth,
  validateRequest({ params: ProfileValidation.idParam }),
  ProfileController.deleteSkill,
);

export const ProfileIdentityRoutes = profileIdentityRouter;
export const ProfessionalProfileRoutes = professionalProfileRouter;
