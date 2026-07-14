import status from "http-status";
import {
  PostVisibility,
  Prisma,
  UserRole,
  UserStatus,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import { paginationHelper } from "../../shared/helpers/paginationHelper";
import {
  ADMIN_USER_SELECT,
  USER_LIST_QUERY_CONFIG,
  USER_SORTABLE_FIELDS,
} from "./user.constant";
import {
  TUpdateUserRolePayload,
  TUpdateUserStatusPayload,
  TUserListQuery,
} from "./user.interface";
import {
  ensureCanDeleteTarget,
  ensureCanManageTargetRole,
  ensureCanManageTargetStatus,
  isDeletedUser,
  mapAdminUser,
  mapPublicUser,
} from "./user.utils";

const publicPostWhere = {
  isDeleted: false,
  visibility: PostVisibility.PUBLIC,
} as const;

const getSearchWhere = (searchTerm?: string): Prisma.UserWhereInput => {
  if (!searchTerm) {
    return {};
  }

  return {
    OR: [
      {
        name: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      {
        profile: {
          is: {
            username: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
      },
    ],
  };
};

const getDefaultVisibilityWhere = (
  query: TUserListQuery,
): Prisma.UserWhereInput => {
  if (query.status === UserStatus.DELETED) {
    return {};
  }

  return {
    status: {
      not: UserStatus.DELETED,
    },
    deletedAt: null,
  };
};

const getUserForManagementOrThrow = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
    select: ADMIN_USER_SELECT,
  });

  if (!user || isDeletedUser(user)) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return user;
};

const getPublicPostsCount = async (authorId: string) => {
  return prisma.post.count({
    where: {
      authorId,
      ...publicPostWhere,
    },
  });
};

const getUserSort = (
  query: TUserListQuery,
): Prisma.UserOrderByWithRelationInput => {
  const sortBy = USER_SORTABLE_FIELDS.includes(
    query.sortBy as (typeof USER_SORTABLE_FIELDS)[number],
  )
    ? query.sortBy
    : USER_LIST_QUERY_CONFIG.defaultSortBy;

  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  return {
    [sortBy as string]: sortOrder,
  };
};

const getUserFilters = (query: TUserListQuery): Prisma.UserWhereInput => {
  return {
    ...(query.role && { role: query.role }),
    ...(query.status && { status: query.status }),
  };
};

const getAllUsers = async (query: TUserListQuery) => {
  const pagination = paginationHelper.calculatePagination(query, {
    defaultSortBy: USER_LIST_QUERY_CONFIG.defaultSortBy,
    defaultSortOrder: USER_LIST_QUERY_CONFIG.defaultSortOrder,
    defaultLimit: USER_LIST_QUERY_CONFIG.defaultLimit,
    maxLimit: USER_LIST_QUERY_CONFIG.maxLimit,
  });

  const where: Prisma.UserWhereInput = {
    AND: [
      getDefaultVisibilityWhere(query),
      getSearchWhere(query.searchTerm),
      getUserFilters(query),
    ],
  };

  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: getUserSort(query),
      select: ADMIN_USER_SELECT,
    }),
    prisma.user.count({
      where,
    }),
  ]);

  return {
    data: data.map((user) => mapAdminUser(user)),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

const getUserById = async (
  id: string,
  requester: Express.AuthenticatedUser,
) => {
  const isAdminViewer =
    requester.role === UserRole.ADMIN ||
    requester.role === UserRole.SUPER_ADMIN;

  const user = await prisma.user.findFirst({
    where: {
      id,
      deletedAt: null,
      status: isAdminViewer
        ? { in: [UserStatus.ACTIVE, UserStatus.SUSPENDED] }
        : UserStatus.ACTIVE,
    },
    select: ADMIN_USER_SELECT,
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const postsCount = await getPublicPostsCount(user.id);

  return isAdminViewer
    ? mapAdminUser(user, { postsCount })
    : mapPublicUser(user, { postsCount });
};

const updateUserRole = async (
  id: string,
  payload: TUpdateUserRolePayload,
  requester: Express.AuthenticatedUser,
) => {
  const targetUser = await getUserForManagementOrThrow(id);

  ensureCanManageTargetRole({
    actorId: requester.id,
    actorRole: requester.role,
    targetId: targetUser.id,
    targetRole: targetUser.role,
    nextRole: payload.role,
  });

  const updatedUser = await prisma.user.update({
    where: {
      id,
    },
    data: {
      role: payload.role,
    },
    select: ADMIN_USER_SELECT,
  });

  return mapAdminUser(updatedUser);
};

const updateUserStatus = async (
  id: string,
  payload: TUpdateUserStatusPayload,
  requester: Express.AuthenticatedUser,
) => {
  const targetUser = await getUserForManagementOrThrow(id);

  ensureCanManageTargetStatus({
    actorId: requester.id,
    actorRole: requester.role,
    targetId: targetUser.id,
    targetRole: targetUser.role,
  });

  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: {
        id,
      },
      data: {
        status: payload.status,
      },
      select: ADMIN_USER_SELECT,
    });

    if (payload.status === UserStatus.SUSPENDED) {
      await tx.session.deleteMany({
        where: {
          userId: id,
        },
      });
    }

    return user;
  });

  return mapAdminUser(updatedUser);
};

const deleteUser = async (id: string, requester: Express.AuthenticatedUser) => {
  const targetUser = await getUserForManagementOrThrow(id);

  ensureCanDeleteTarget({
    actorId: requester.id,
    actorRole: requester.role,
    targetId: targetUser.id,
    targetRole: targetUser.role,
  });

  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: {
        id,
      },
      data: {
        status: UserStatus.DELETED,
        deletedAt: new Date(),
        lastLoginAt: null,
      },
      select: ADMIN_USER_SELECT,
    });

    await tx.session.deleteMany({
      where: {
        userId: id,
      },
    });

    return user;
  });

  return mapAdminUser(updatedUser);
};

export const UserService = {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
};
