import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { EducationService } from "./education.service";
import { ExperienceService } from "./experience.service";
import { ProfileService } from "./profile.service";
import { ProfileMediaService } from "./profileMedia.service";
import { SkillService } from "./skill.service";

const getMyProfile = catchAsync(async (req, res) => {
  const result = await ProfileService.getOwnProfile(req.user!.id);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req, res) => {
  const result = await ProfileService.updateMyProfile(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const updateAvatar = catchAsync(async (req, res) => {
  const result = await ProfileMediaService.updateAvatar(req.user!.id, req.file);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Profile avatar updated successfully",
    data: result,
  });
});

const updateCover = catchAsync(async (req, res) => {
  const result = await ProfileMediaService.updateCover(req.user!.id, req.file);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Profile cover updated successfully",
    data: result,
  });
});

const getPublicProfile = catchAsync(async (req, res) => {
  const result = await ProfileService.getPublicProfile(
    req.params.username as string,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Public profile retrieved successfully",
    data: result,
  });
});

const createExperience = catchAsync(async (req, res) => {
  const result = await ExperienceService.createExperience(
    req.user!.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Experience added successfully",
    data: result,
  });
});

const getMyExperiences = catchAsync(async (req, res) => {
  const result = await ExperienceService.getMyExperiences(req.user!.id);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Experiences retrieved successfully",
    data: result,
  });
});

const updateExperience = catchAsync(async (req, res) => {
  const result = await ExperienceService.updateExperience(
    req.user!.id,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Experience updated successfully",
    data: result,
  });
});

const deleteExperience = catchAsync(async (req, res) => {
  await ExperienceService.deleteExperience(
    req.user!.id,
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Experience deleted successfully",
    data: null,
  });
});

const createEducation = catchAsync(async (req, res) => {
  const result = await EducationService.createEducation(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Education added successfully",
    data: result,
  });
});

const getMyEducation = catchAsync(async (req, res) => {
  const result = await EducationService.getMyEducation(req.user!.id);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Education retrieved successfully",
    data: result,
  });
});

const updateEducation = catchAsync(async (req, res) => {
  const result = await EducationService.updateEducation(
    req.user!.id,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Education updated successfully",
    data: result,
  });
});

const deleteEducation = catchAsync(async (req, res) => {
  await EducationService.deleteEducation(req.user!.id, req.params.id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Education deleted successfully",
    data: null,
  });
});

const addSkill = catchAsync(async (req, res) => {
  const result = await SkillService.addSkill(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "Skill added successfully",
    data: result,
  });
});

const getMySkills = catchAsync(async (req, res) => {
  const result = await SkillService.getMySkills(req.user!.id);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Skills retrieved successfully",
    data: result,
  });
});

const deleteSkill = catchAsync(async (req, res) => {
  const result = await SkillService.deleteSkill(
    req.user!.id,
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: {
      removed: result.removed,
    },
  });
});

export const ProfileController = {
  getMyProfile,
  updateMyProfile,
  updateAvatar,
  updateCover,
  getPublicProfile,
  createExperience,
  getMyExperiences,
  updateExperience,
  deleteExperience,
  createEducation,
  getMyEducation,
  updateEducation,
  deleteEducation,
  addSkill,
  getMySkills,
  deleteSkill,
};
