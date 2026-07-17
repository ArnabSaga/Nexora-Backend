export type TSkillResponse = {
  id: string;
  skillId: string;
  name: string;
  createdAt: Date;
};

export type TCreateSkillPayload = {
  name: string;
};
