import status from "http-status";
import { NotificationType } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import { paginationHelper } from "../../shared/helpers/paginationHelper";
import { isUniqueConstraintOn } from "../../shared/helpers/prismaUnique";
import { ACTIVE_PUBLIC_USER_WHERE } from "../../shared/policies/user.policy";
import { createPrismaNotificationWriter } from "../../shared/notifications/notification-writer.prisma.factory";
import { DEFAULT_USER_SELECT } from "../user/user.constant";
import { mapPublicUser } from "../user/user.utils";
import {
  FOLLOW_DEFAULT_PAGE,
  FOLLOW_MAX_PAGE,
  FOLLOW_PAGINATION_CONFIG,
} from "./follow.constant";
import type {
  TFollowActionResult,
  TFollowListQuery,
  TFollowListResult,
} from "./follow.interface";

const calculateFollowPagination = (query: TFollowListQuery) => {
  const page = query.page ?? FOLLOW_DEFAULT_PAGE;

  if (
    !Number.isSafeInteger(page) ||
    page < FOLLOW_DEFAULT_PAGE ||
    page > FOLLOW_MAX_PAGE
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      `Page must be between ${FOLLOW_DEFAULT_PAGE} and ${FOLLOW_MAX_PAGE}`,
    );
  }

  return paginationHelper.calculatePagination(query, FOLLOW_PAGINATION_CONFIG);
};

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

const followUser = async (
  targetUserId: string,
  requester: Express.AuthenticatedUser,
): Promise<TFollowActionResult> => {
  if (requester.id === targetUserId) {
    throw new AppError(status.BAD_REQUEST, "You cannot follow yourself");
  }

  await getActiveUserOrThrow(targetUserId);

  try {
    await prisma.$transaction(async (tx) => {
      const follow = await tx.follow.create({
        data: {
          followerId: requester.id,
          followingId: targetUserId,
        },
        select: { id: true },
      });
      await createPrismaNotificationWriter(tx).writeEvents([
        {
          type: NotificationType.FOLLOW,
          senderId: requester.id,
          receiverId: targetUserId,
          sourceKey: `FOLLOW:${follow.id}`,
          target: null,
        },
      ]);
    });
  } catch (error) {
    if (isUniqueConstraintOn(error, ["followerId", "followingId"])) {
      return {
        statusCode: status.OK,
        message: "Already following",
        data: {
          following: true,
        },
      };
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

  await prisma.follow.deleteMany({
    where: {
      followerId: requester.id,
      followingId: targetUserId,
    },
  });

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
  query: TFollowListQuery,
): Promise<TFollowListResult> => {
  await getActiveUserOrThrow(userId);

  const pagination = calculateFollowPagination(query);
  const where = {
    followingId: userId,
    follower: {
      is: ACTIVE_PUBLIC_USER_WHERE,
    },
  };
  const [total, follows] = await Promise.all([
    prisma.follow.count({ where }),
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
  query: TFollowListQuery,
): Promise<TFollowListResult> => {
  await getActiveUserOrThrow(userId);

  const pagination = calculateFollowPagination(query);
  const where = {
    followerId: userId,
    following: {
      is: ACTIVE_PUBLIC_USER_WHERE,
    },
  };
  const [total, follows] = await Promise.all([
    prisma.follow.count({ where }),
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
  query: TFollowListQuery,
): Promise<TFollowListResult> => {
  const pagination = calculateFollowPagination(query);
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
    prisma.user.count({ where }),
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
