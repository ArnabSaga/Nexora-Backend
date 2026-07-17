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
