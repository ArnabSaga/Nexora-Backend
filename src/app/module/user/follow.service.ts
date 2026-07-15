import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import { paginationHelper } from "../../shared/helpers/paginationHelper";
import { ACTIVE_PUBLIC_USER_WHERE, DEFAULT_USER_SELECT } from "./user.constant";
import {
  TFollowActionResult,
  TPaginatedResult,
  TPublicUser,
  TUserListQuery,
} from "./user.interface";
import { mapPublicUser } from "./user.utils";

const getActiveUserOrThrow = async (id: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id,
      ...ACTIVE_PUBLIC_USER_WHERE,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return user;
};

const alreadyFollowingResponse = (): TFollowActionResult => ({
  statusCode: status.OK,
  message: "Already following",
  data: {
    following: true,
  },
});

const isFollowUniqueConstraintTarget = (target: unknown): boolean => {
  const includesFollowFields = (value: string) => {
    return value.includes("followerId") && value.includes("followingId");
  };

  if (Array.isArray(target)) {
    return target.includes("followerId") && target.includes("followingId");
  }

  if (typeof target === "string") {
    return includesFollowFields(target);
  }

  return false;
};

const isFollowUniqueConstraintError = (
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    isFollowUniqueConstraintTarget(error.meta?.target)
  );
};

const followUser = async (
  targetUserId: string,
  requester: Express.AuthenticatedUser,
): Promise<TFollowActionResult> => {
  if (requester.id === targetUserId) {
    throw new AppError(status.BAD_REQUEST, "You cannot follow yourself");
  }

  await getActiveUserOrThrow(targetUserId);

  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: requester.id,
        followingId: targetUserId,
      },
    },
  });

  if (existingFollow) {
    return alreadyFollowingResponse();
  }

  try {
    await prisma.follow.create({
      data: {
        followerId: requester.id,
        followingId: targetUserId,
      },
    });
  } catch (error) {
    if (isFollowUniqueConstraintError(error)) {
      return alreadyFollowingResponse();
    }

    throw error;
  }

  return {
    statusCode: status.CREATED,
    message: "User followed successfully",
    data: {
      following: true,
    },
  };
};

const unfollowUser = async (
  targetUserId: string,
  requester: Express.AuthenticatedUser,
): Promise<TFollowActionResult> => {
  if (requester.id === targetUserId) {
    throw new AppError(status.BAD_REQUEST, "You cannot unfollow yourself");
  }

  const result = await prisma.follow.deleteMany({
    where: {
      followerId: requester.id,
      followingId: targetUserId,
    },
  });

  if (result.count === 0) {
    return {
      statusCode: status.OK,
      message: "User is not currently followed",
      data: {
        following: false,
      },
    };
  }

  return {
    statusCode: status.OK,
    message: "User unfollowed successfully",
    data: {
      following: false,
    },
  };
};

const getFollowers = async (
  userId: string,
  query: TUserListQuery,
): Promise<TPaginatedResult<TPublicUser>> => {
  await getActiveUserOrThrow(userId);

  const pagination = paginationHelper.calculatePagination(query, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    maxLimit: 100,
  });

  const where = {
    followingId: userId,
    follower: {
      is: ACTIVE_PUBLIC_USER_WHERE,
    },
  };

  const [total, follows] = await Promise.all([
    prisma.follow.count({
      where,
    }),
    prisma.follow.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        follower: {
          select: DEFAULT_USER_SELECT,
        },
      },
    }),
  ]);

  return {
    data: follows.map((follow) => mapPublicUser(follow.follower)),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

const getFollowing = async (
  userId: string,
  query: TUserListQuery,
): Promise<TPaginatedResult<TPublicUser>> => {
  await getActiveUserOrThrow(userId);

  const pagination = paginationHelper.calculatePagination(query, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    maxLimit: 100,
  });

  const where = {
    followerId: userId,
    following: {
      is: ACTIVE_PUBLIC_USER_WHERE,
    },
  };

  const [total, follows] = await Promise.all([
    prisma.follow.count({
      where,
    }),
    prisma.follow.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        following: {
          select: DEFAULT_USER_SELECT,
        },
      },
    }),
  ]);

  return {
    data: follows.map((follow) => mapPublicUser(follow.following)),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

const getSuggestions = async (
  requester: Express.AuthenticatedUser,
  query: TUserListQuery,
): Promise<TPaginatedResult<TPublicUser>> => {
  const pagination = paginationHelper.calculatePagination(query, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    maxLimit: 100,
  });

  const where = {
    ...ACTIVE_PUBLIC_USER_WHERE,
    id: {
      not: requester.id,
    },
    followers: {
      none: {
        followerId: requester.id,
      },
    },
    profile: {
      isNot: null,
    },
  };

  const [total, users] = await Promise.all([
    prisma.user.count({
      where,
    }),
    prisma.user.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: {
        createdAt: "desc",
      },
      select: DEFAULT_USER_SELECT,
    }),
  ]);

  return {
    data: users.map((user) => mapPublicUser(user)),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

export const FollowService = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getSuggestions,
};
