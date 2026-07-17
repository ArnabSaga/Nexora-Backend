import { Prisma } from "../../../generated/prisma/client";
import { PUBLIC_USER_COUNT_SELECT } from "../user/user.constant";

export const PROFILE_CORE_SELECT = {
  id: true,
  username: true,
  bio: true,
  headline: true,
  avatar: true,
  coverPhoto: true,
  location: true,
  website: true,
  profession: true,
  company: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProfileSelect;

export const PROFILE_OWNER_SELECT = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  createdAt: true,
  status: true,
  deletedAt: true,
  profile: {
    select: PROFILE_CORE_SELECT,
  },
  _count: {
    select: PUBLIC_USER_COUNT_SELECT,
  },
} satisfies Prisma.UserSelect;

export const PUBLIC_PROFILE_OWNER_SELECT = {
  id: true,
  name: true,
  image: true,
  createdAt: true,
  status: true,
  deletedAt: true,
  profile: {
    select: PROFILE_CORE_SELECT,
  },
  _count: {
    select: PUBLIC_USER_COUNT_SELECT,
  },
} satisfies Prisma.UserSelect;

export const EXPERIENCE_SELECT = {
  id: true,
  title: true,
  company: true,
  location: true,
  startDate: true,
  endDate: true,
  isCurrent: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ExperienceSelect;

export const EDUCATION_SELECT = {
  id: true,
  institution: true,
  degree: true,
  fieldOfStudy: true,
  startDate: true,
  endDate: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EducationSelect;

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

export const PROFILE_USERNAME_RETRY_LIMIT = 3;

export const PROFILE_UPDATE_FIELDS = [
  "username",
  "bio",
  "headline",
  "location",
  "website",
  "profession",
  "company",
] as const;
