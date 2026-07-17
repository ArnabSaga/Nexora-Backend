import { TSkillResponse } from "./skill.interface";

type TUserSkillPayload = {
  id: string;
  skillId: string;
  createdAt: Date;
  skill: {
    id: string;
    name: string;
  };
};

export const mapSkill = (userSkill: TUserSkillPayload): TSkillResponse => ({
  id: userSkill.id,
  skillId: userSkill.skillId,
  name: userSkill.skill.name,
  createdAt: userSkill.createdAt,
});
