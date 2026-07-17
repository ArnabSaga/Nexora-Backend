import type { TEducationResponse } from "../education/education.interface";
import type { TExperienceResponse } from "../experience/experience.interface";
import type { TSkillResponse } from "../skill/skill.interface";

export type TProfessionalDetails = {
  experience: TExperienceResponse[];
  education: TEducationResponse[];
  skills: TSkillResponse[];
};
