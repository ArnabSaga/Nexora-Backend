import { Prisma } from "../../../generated/prisma/client";

export const USER_SKILL_SELECT = {
  id: true,
  skillId: true,
  createdAt: true,
  skill: {
    select: {
      id: true,
      name: true,
      normalizedName: true,
    },
  },
} satisfies Prisma.UserSkillSelect;
