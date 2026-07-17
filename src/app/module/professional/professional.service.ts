import { EducationService } from "../education/education.service";
import { ExperienceService } from "../experience/experience.service";
import { SkillService } from "../skill/skill.service";
import type { TProfessionalDetails } from "./professional.interface";

const getOwnProfessionalDetails = async (
  userId: string,
): Promise<TProfessionalDetails> => {
  const [experience, education, skills] = await Promise.all([
    ExperienceService.getOwn(userId),
    EducationService.getOwn(userId),
    SkillService.getOwn(userId),
  ]);

  return {
    experience,
    education,
    skills,
  };
};

const getPublicProfessionalDetails = async (
  userId: string,
): Promise<TProfessionalDetails> => {
  const [experience, education, skills] = await Promise.all([
    ExperienceService.getPublic(userId),
    EducationService.getPublic(userId),
    SkillService.getPublic(userId),
  ]);

  return {
    experience,
    education,
    skills,
  };
};

export const ProfessionalService = {
  getOwnProfessionalDetails,
  getPublicProfessionalDetails,
};
