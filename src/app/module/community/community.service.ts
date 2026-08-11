import status from "http-status";
import {
  CommunityMemberRole,
  CommunityMemberStatus,
  Prisma,
  UserRole,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import { paginationHelper } from "../../shared/helpers/paginationHelper";
import { isUniqueConstraintOn } from "../../shared/helpers/prismaUnique";
import slugify from "../../shared/helpers/slugify";
import {
  AVAILABLE_COMMUNITY_WHERE,
  buildReadableCommunityWhere,
} from "../../shared/policies/community.policy";
import { mapPublicUser } from "../user/user.utils";
import {
  COMMUNITY_DEFAULT_LIMIT,
  COMMUNITY_DEFAULT_PAGE,
  COMMUNITY_MAX_LIMIT,
  COMMUNITY_MAX_PAGE,
  COMMUNITY_PAGINATION_CONFIG,
} from "./community.constant";
import type {
  TCommunityListQuery,
  TCommunityListResult,
  TCommunityResponse,
  TCreateCommunityPayload,
  TUpdateCommunityPayload,
} from "./community.interface";
import { CommunitySelect, type TCommunityPayload } from "./community.select";

type TViewerMembership = {
  communityId: string;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
};

export const calculateCommunityPagination = (query: TCommunityListQuery) => {
  const page = query.page ?? COMMUNITY_DEFAULT_PAGE;
  const limit = query.limit ?? COMMUNITY_DEFAULT_LIMIT;

  if (!Number.isSafeInteger(page) || page < 1 || page > COMMUNITY_MAX_PAGE) {
    throw new AppError(
      status.BAD_REQUEST,
      `Page must be between 1 and ${COMMUNITY_MAX_PAGE}`,
    );
  }

  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > COMMUNITY_MAX_LIMIT
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      `Limit must be between 1 and ${COMMUNITY_MAX_LIMIT}`,
    );
  }

  const pagination = paginationHelper.calculatePagination(
    query,
    COMMUNITY_PAGINATION_CONFIG,
  );

  return {
    page: pagination.page,
    limit: pagination.limit,
    skip: pagination.skip,
    take: pagination.limit,
  };
};

const mapCommunity = (
  community: TCommunityPayload,
  membership?: TViewerMembership,
): TCommunityResponse => ({
  id: community.id,
  name: community.name,
  slug: community.slug,
  description: community.description ?? null,
  avatar: community.avatar ?? null,
  coverPhoto: community.coverPhoto ?? null,
  visibility: community.visibility,
  owner: mapPublicUser(community.owner),
  membersCount: community._count.members,
  viewerState: {
    role: membership?.role ?? null,
    status: membership?.status ?? null,
  },
  createdAt: community.createdAt,
  updatedAt: community.updatedAt,
});

const getViewerMemberships = async (
  communityIds: string[],
  viewer?: Express.AuthenticatedUser,
) => {
  if (!viewer || communityIds.length === 0) {
    return new Map<string, TViewerMembership>();
  }

  const memberships = await prisma.communityMember.findMany({
    where: {
      userId: viewer.id,
      communityId: { in: [...new Set(communityIds)] },
    },
    select: {
      communityId: true,
      role: true,
      status: true,
    },
  });

  return new Map(
    memberships.map((membership) => [membership.communityId, membership]),
  );
};

const createCommunity = async (
  requester: Express.AuthenticatedUser,
  payload: TCreateCommunityPayload,
) => {
  try {
    const community = await prisma.community.create({
      data: {
        ownerId: requester.id,
        name: payload.name,
        slug: slugify(payload.name),
        description: payload.description,
        visibility: payload.visibility,
        members: {
          create: {
            userId: requester.id,
            role: CommunityMemberRole.OWNER,
            status: CommunityMemberStatus.ACTIVE,
          },
        },
      },
      select: CommunitySelect.PUBLIC,
    });

    return mapCommunity(community, {
      communityId: community.id,
      role: CommunityMemberRole.OWNER,
      status: CommunityMemberStatus.ACTIVE,
    });
  } catch (error) {
    if (isUniqueConstraintOn(error, ["slug"])) {
      throw new AppError(status.CONFLICT, "Community slug is already reserved");
    }

    throw error;
  }
};

const getCommunities = async (
  query: TCommunityListQuery,
  viewer?: Express.AuthenticatedUser,
): Promise<TCommunityListResult> => {
  const pagination = calculateCommunityPagination(query);
  const where = buildReadableCommunityWhere(viewer);
  const [communities, total] = await prisma.$transaction([
    prisma.community.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { createdAt: "desc" },
      select: CommunitySelect.PUBLIC,
    }),
    prisma.community.count({ where }),
  ]);
  const memberships = await getViewerMemberships(
    communities.map((community) => community.id),
    viewer,
  );

  return {
    data: communities.map((community) =>
      mapCommunity(community, memberships.get(community.id)),
    ),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

const getCommunityBySlug = async (
  slug: string,
  viewer?: Express.AuthenticatedUser,
) => {
  const community = await prisma.community.findFirst({
    where: {
      slug,
      ...buildReadableCommunityWhere(viewer),
    },
    select: CommunitySelect.PUBLIC,
  });

  if (!community) {
    throw new AppError(status.NOT_FOUND, "Community not found");
  }

  const memberships = await getViewerMemberships([community.id], viewer);

  return mapCommunity(community, memberships.get(community.id));
};

const updateCommunity = async (
  id: string,
  requester: Express.AuthenticatedUser,
  payload: TUpdateCommunityPayload,
) => {
  const community = await prisma.community.findFirst({
    where: {
      id,
      ...AVAILABLE_COMMUNITY_WHERE,
      OR: [
        { ownerId: requester.id },
        {
          members: {
            some: {
              userId: requester.id,
              status: CommunityMemberStatus.ACTIVE,
              role: CommunityMemberRole.ADMIN,
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  if (!community) {
    throw new AppError(status.NOT_FOUND, "Community not found");
  }

  const updated = await prisma.community.update({
    where: { id: community.id },
    data: {
      ...(payload.name !== undefined && { name: payload.name }),
      ...(payload.description !== undefined && {
        description: payload.description,
      }),
      ...(payload.visibility !== undefined && {
        visibility: payload.visibility,
      }),
    },
    select: CommunitySelect.PUBLIC,
  });
  const memberships = await getViewerMemberships([id], requester);

  return mapCommunity(updated, memberships.get(id));
};

const deleteCommunity = async (
  id: string,
  requester: Express.AuthenticatedUser,
) => {
  const community = await prisma.community.findUnique({
    where: { id },
    select: { id: true, ownerId: true, deletedAt: true },
  });
  const isPlatformAdmin =
    requester.role === UserRole.ADMIN ||
    requester.role === UserRole.SUPER_ADMIN;

  if (!community || (community.ownerId !== requester.id && !isPlatformAdmin)) {
    throw new AppError(status.NOT_FOUND, "Community not found");
  }

  if (!community.deletedAt) {
    await prisma.community.updateMany({
      where: { id: community.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  return null;
};

export const CommunityService = {
  createCommunity,
  getCommunities,
  getCommunityBySlug,
  updateCommunity,
  deleteCommunity,
};
