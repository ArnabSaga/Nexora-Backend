import status from "http-status";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import {
  cleanSkillDisplayName,
  normalizeSkillName,
} from "../../shared/helpers/skillName";
import { isUniqueConstraintOn } from "../../shared/helpers/prismaUnique";
import { TCreateSkillPayload } from "./profile.interface";
import { USER_SKILL_SELECT } from "./profile.constant";
import { mapSkill } from "./profile.utils";

const getSkillByNormalizedName = async (normalizedName: string) => {
  return prisma.skill.findUnique({
    where: {
      normalizedName,
    },
  });
};

const getOrCreateSkill = async (name: string) => {
  const displayName = cleanSkillDisplayName(name);
  const normalizedName = normalizeSkillName(displayName);

  if (!displayName || !normalizedName) {
    throw new AppError(status.BAD_REQUEST, "Skill name is required");
  }

  if (displayName.length > 100) {
    throw new AppError(
      status.BAD_REQUEST,
      "Skill name must not exceed 100 characters",
    );
  }

  const existingSkill = await getSkillByNormalizedName(normalizedName);

  if (existingSkill) {
    return existingSkill;
  }

  try {
    return await prisma.skill.create({
      data: {
        name: displayName,
        normalizedName,
      },
    });
  } catch (error) {
    if (
      isUniqueConstraintOn(error, ["normalizedName"]) ||
      isUniqueConstraintOn(error, ["name"])
    ) {
      const skill = await getSkillByNormalizedName(normalizedName);

      if (skill) {
        return skill;
      }
    }

    throw error;
  }
};

export const getSkillRows = async (userId: string) => {
  return prisma.userSkill.findMany({
    where: {
      userId,
    },
    orderBy: {
      skill: {
        name: "asc",
      },
    },
    select: USER_SKILL_SELECT,
  });
};

const addSkill = async (userId: string, payload: TCreateSkillPayload) => {
  const skill = await getOrCreateSkill(payload.name);

  try {
    const userSkill = await prisma.userSkill.upsert({
      where: {
        userId_skillId: {
          userId,
          skillId: skill.id,
        },
      },
      create: {
        userId,
        skillId: skill.id,
      },
      update: {},
      select: USER_SKILL_SELECT,
    });

    return mapSkill(userSkill);
  } catch (error) {
    if (isUniqueConstraintOn(error, ["userId", "skillId"])) {
      const userSkill = await prisma.userSkill.findUnique({
        where: {
          userId_skillId: {
            userId,
            skillId: skill.id,
          },
        },
        select: USER_SKILL_SELECT,
      });

      if (userSkill) {
        return mapSkill(userSkill);
      }
    }

    throw error;
  }
};

const getMySkills = async (userId: string) => {
  const skills = await getSkillRows(userId);

  return skills.map(mapSkill);
};

const deleteSkill = async (userId: string, id: string) => {
  const result = await prisma.userSkill.deleteMany({
    where: {
      id,
      userId,
    },
  });

  return {
    removed: result.count > 0,
    message:
      result.count > 0 ? "Skill removed successfully" : "Skill is not attached",
  };
};

export const SkillService = {
  addSkill,
  getMySkills,
  deleteSkill,
};
