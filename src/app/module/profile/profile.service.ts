import status from "http-status";
import { UserStatus } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { PUBLIC_PROFILE_POST_WHERE } from "../../shared/constants/post.constant";
import AppError from "../../shared/errors/AppError";
import { isUniqueConstraintOn } from "../../shared/helpers/prismaUnique";
import {
  createProfileUsernameCandidate,
  normalizeUsername,
} from "../../shared/helpers/username";
import { ProfessionalService } from "../professional/professional.service";
import { ACTIVE_PUBLIC_USER_WHERE } from "../user/user.constant";
import {
  PROFILE_OWNER_SELECT,
  PROFILE_UPDATE_FIELDS,
  PROFILE_USERNAME_RETRY_LIMIT,
  PUBLIC_PROFILE_OWNER_SELECT,
} from "./profile.constant";
import { TUpdateProfilePayload } from "./profile.interface";
import { mapOwnProfile, mapPublicProfile } from "./profile.utils";

const getPublicPostsCount = async (authorId: string) => {
  return prisma.post.count({
    where: {
      ...PUBLIC_PROFILE_POST_WHERE,
      authorId,
    },
  });
};

const getProfileOwnerSeed = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return user;
};

const fetchProfileByUserIdOrThrow = async (userId: string) => {
  const profile = await prisma.profile.findUnique({
    where: {
      userId,
    },
  });

  if (!profile) {
    throw new AppError(status.NOT_FOUND, "Profile not found");
  }

  return profile;
};

export const ensureProfileForUser = async (userId: string) => {
  const existingProfile = await prisma.profile.findUnique({
    where: {
      userId,
    },
  });

  if (existingProfile) {
    return existingProfile;
  }

  const user = await getProfileOwnerSeed(userId);

  for (let attempt = 1; attempt <= PROFILE_USERNAME_RETRY_LIMIT; attempt += 1) {
    try {
      return await prisma.profile.create({
        data: {
          userId,
          username: createProfileUsernameCandidate(user, attempt),
        },
      });
    } catch (error) {
      if (isUniqueConstraintOn(error, ["userId"])) {
        return fetchProfileByUserIdOrThrow(userId);
      }

      if (isUniqueConstraintOn(error, ["username"])) {
        continue;
      }

      throw error;
    }
  }

  throw new AppError(
    status.CONFLICT,
    "Could not generate a unique profile username",
  );
};

const getOwnProfile = async (userId: string) => {
  await ensureProfileForUser(userId);

  const [user, postsCount, professionalDetails] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: PROFILE_OWNER_SELECT,
    }),
    getPublicPostsCount(userId),
    ProfessionalService.getOwnProfessionalDetails(userId),
  ]);

  if (!user || !user.profile) {
    throw new AppError(status.NOT_FOUND, "Profile not found");
  }

  return mapOwnProfile({
    user,
    postsCount,
    professionalDetails,
  });
};

const getPublicProfile = async (username: string) => {
  const normalizedUsername = normalizeUsername(username);

  const user = await prisma.user.findFirst({
    where: {
      ...ACTIVE_PUBLIC_USER_WHERE,
      profile: {
        is: {
          username: normalizedUsername,
        },
      },
    },
    select: PUBLIC_PROFILE_OWNER_SELECT,
  });

  if (
    !user ||
    !user.profile ||
    user.status !== UserStatus.ACTIVE ||
    user.deletedAt
  ) {
    throw new AppError(status.NOT_FOUND, "Profile not found");
  }

  const [postsCount, professionalDetails] = await Promise.all([
    getPublicPostsCount(user.id),
    ProfessionalService.getPublicProfessionalDetails(user.id),
  ]);

  return mapPublicProfile({
    user,
    postsCount,
    professionalDetails,
  });
};

const updateMyProfile = async (
  userId: string,
  payload: TUpdateProfilePayload,
) => {
  await ensureProfileForUser(userId);

  const updateData: Partial<TUpdateProfilePayload> = {};

  for (const field of PROFILE_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      (
        updateData as Record<
          typeof field,
          TUpdateProfilePayload[typeof field]
        >
      )[field] = payload[field];
    }
  }

  if (typeof updateData.username === "string") {
    updateData.username = normalizeUsername(updateData.username);
  }

  try {
    await prisma.profile.update({
      where: {
        userId,
      },
      data: updateData,
    });
  } catch (error) {
    if (isUniqueConstraintOn(error, ["username"])) {
      throw new AppError(status.CONFLICT, "Username is already taken");
    }

    throw error;
  }

  return getOwnProfile(userId);
};

export const ProfileService = {
  ensureProfileForUser,
  getOwnProfile,
  getPublicProfile,
  updateMyProfile,
};
