import status from "http-status";
import {
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityVisibility,
  Prisma,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import { isUniqueConstraintOn } from "../../shared/helpers/prismaUnique";
import {
  AVAILABLE_COMMUNITY_WHERE,
  PUBLIC_COMMUNITY_MEMBER_WHERE,
  buildReadableCommunityWhere,
} from "../../shared/policies/community.policy";
import { mapPublicUser } from "../user/user.utils";
import { calculateCommunityPagination } from "../community/community.pagination";
import type {
  TCommunityMemberListQuery,
  TCommunityMemberListResult,
  TCommunityMemberResponse,
  TCommunityMembershipActionResult,
  TUpdateCommunityRolePayload,
  TUpdateCommunityStatusPayload,
} from "./community-member.interface";
import {
  CommunityMemberSelect,
  type TCommunityMemberPayload,
} from "./community-member.select";

type TManagedMembership = {
  id: string;
  userId: string;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
};

const mapCommunityMember = (
  member: TCommunityMemberPayload,
): TCommunityMemberResponse => ({
  id: member.id,
  user: mapPublicUser(member.user),
  role: member.role,
  status: member.status,
  joinedAt: member.joinedAt,
});

const toMembershipResult = (
  membership: TManagedMembership,
  statusCode: number,
  message: string,
): TCommunityMembershipActionResult => ({
  statusCode,
  message,
  data: {
    id: membership.id,
    role: membership.role,
    status: membership.status,
  },
});

const joinCommunity = async (
  communityId: string,
  requester: Express.AuthenticatedUser,
): Promise<TCommunityMembershipActionResult> => {
  const community = await prisma.community.findFirst({
    where: { id: communityId, ...AVAILABLE_COMMUNITY_WHERE },
    select: { id: true, visibility: true },
  });

  if (!community) {
    throw new AppError(status.NOT_FOUND, "Community not found");
  }

  const desiredStatus =
    community.visibility === CommunityVisibility.PUBLIC
      ? CommunityMemberStatus.ACTIVE
      : CommunityMemberStatus.PENDING;

  try {
    const membership = await prisma.communityMember.create({
      data: {
        communityId,
        userId: requester.id,
        role: CommunityMemberRole.MEMBER,
        status: desiredStatus,
      },
      select: { id: true, userId: true, role: true, status: true },
    });

    return toMembershipResult(
      membership,
      desiredStatus === CommunityMemberStatus.ACTIVE
        ? status.CREATED
        : status.ACCEPTED,
      desiredStatus === CommunityMemberStatus.ACTIVE
        ? "Community joined successfully"
        : "Community join request submitted",
    );
  } catch (error) {
    if (!isUniqueConstraintOn(error, ["communityId", "userId"])) {
      throw error;
    }
  }

  let membership = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId: requester.id } },
    select: { id: true, userId: true, role: true, status: true },
  });

  if (!membership) {
    throw new AppError(
      status.CONFLICT,
      "Community membership changed concurrently",
    );
  }

  if (membership.status === CommunityMemberStatus.BANNED) {
    throw new AppError(status.FORBIDDEN, "You cannot join this community");
  }

  if (
    membership.status === CommunityMemberStatus.PENDING &&
    community.visibility === CommunityVisibility.PUBLIC
  ) {
    await prisma.communityMember.updateMany({
      where: {
        id: membership.id,
        status: CommunityMemberStatus.PENDING,
      },
      data: { status: CommunityMemberStatus.ACTIVE },
    });
    membership = await prisma.communityMember.findUniqueOrThrow({
      where: { id: membership.id },
      select: { id: true, userId: true, role: true, status: true },
    });
  }

  return toMembershipResult(
    membership,
    status.OK,
    "Community membership retrieved",
  );
};

const leaveCommunity = async (
  communityId: string,
  requester: Express.AuthenticatedUser,
) => {
  const membership = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId: requester.id } },
    select: { id: true, role: true, status: true },
  });

  if (membership?.role === CommunityMemberRole.OWNER) {
    throw new AppError(status.BAD_REQUEST, "Community owner cannot leave");
  }

  if (membership && membership.status !== CommunityMemberStatus.BANNED) {
    await prisma.communityMember.deleteMany({ where: { id: membership.id } });
  }

  return null;
};

const resolveManagementContext = async (
  communityId: string,
  requesterId: string,
  targetUserId?: string,
) => {
  const userIds = targetUserId ? [requesterId, targetUserId] : [requesterId];
  const community = await prisma.community.findFirst({
    where: { id: communityId, ...AVAILABLE_COMMUNITY_WHERE },
    select: {
      id: true,
      ownerId: true,
      members: {
        where: { userId: { in: userIds } },
        select: { id: true, userId: true, role: true, status: true },
      },
    },
  });

  if (!community) {
    throw new AppError(status.NOT_FOUND, "Community not found");
  }

  const requesterMembership = community.members.find(
    (member) => member.userId === requesterId,
  );
  const requesterRole =
    community.ownerId === requesterId
      ? CommunityMemberRole.OWNER
      : requesterMembership?.status === CommunityMemberStatus.ACTIVE
        ? requesterMembership.role
        : null;
  const targetMembership = targetUserId
    ? (community.members.find((member) => member.userId === targetUserId) ??
      null)
    : null;

  return { community, requesterRole, targetMembership };
};

const getCommunityMembers = async (
  communityId: string,
  query: TCommunityMemberListQuery,
  viewer?: Express.AuthenticatedUser,
): Promise<TCommunityMemberListResult> => {
  const requestedStatus = query.status ?? CommunityMemberStatus.ACTIVE;
  const community = await prisma.community.findFirst({
    where: {
      id: communityId,
      ...buildReadableCommunityWhere(viewer),
    },
    select: { id: true, ownerId: true },
  });

  if (!community) {
    throw new AppError(status.NOT_FOUND, "Community not found");
  }

  if (requestedStatus !== CommunityMemberStatus.ACTIVE) {
    if (!viewer) {
      throw new AppError(status.NOT_FOUND, "Community not found");
    }
    const context = await resolveManagementContext(communityId, viewer.id);
    if (
      context.requesterRole !== CommunityMemberRole.OWNER &&
      context.requesterRole !== CommunityMemberRole.ADMIN
    ) {
      throw new AppError(status.NOT_FOUND, "Community not found");
    }
  }

  const pagination = calculateCommunityPagination(query);
  const where = {
    communityId,
    status: requestedStatus,
    ...(requestedStatus === CommunityMemberStatus.ACTIVE &&
      PUBLIC_COMMUNITY_MEMBER_WHERE),
  } satisfies Prisma.CommunityMemberWhereInput;
  const [members, total] = await prisma.$transaction([
    prisma.communityMember.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { joinedAt: "desc" },
      select: CommunityMemberSelect.PUBLIC,
    }),
    prisma.communityMember.count({ where }),
  ]);

  return {
    data: members.map(mapCommunityMember),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

const updateMemberRole = async (
  communityId: string,
  userId: string,
  requester: Express.AuthenticatedUser,
  payload: TUpdateCommunityRolePayload,
) => {
  const { requesterRole, targetMembership } = await resolveManagementContext(
    communityId,
    requester.id,
    userId,
  );

  if (
    !targetMembership ||
    targetMembership.status !== CommunityMemberStatus.ACTIVE
  ) {
    throw new AppError(status.NOT_FOUND, "Community member not found");
  }
  if (targetMembership.role === CommunityMemberRole.OWNER) {
    throw new AppError(status.FORBIDDEN, "Community owner cannot be modified");
  }

  const ownerAllowed = requesterRole === CommunityMemberRole.OWNER;
  const adminAllowed =
    requesterRole === CommunityMemberRole.ADMIN &&
    targetMembership.role !== CommunityMemberRole.ADMIN &&
    payload.role !== CommunityMemberRole.ADMIN;

  if (!ownerAllowed && !adminAllowed) {
    throw new AppError(status.NOT_FOUND, "Community member not found");
  }

  const updated = await prisma.communityMember.update({
    where: { id: targetMembership.id },
    data: { role: payload.role },
    select: CommunityMemberSelect.PUBLIC,
  });

  return mapCommunityMember(updated);
};

const updateMemberStatus = async (
  communityId: string,
  userId: string,
  requester: Express.AuthenticatedUser,
  payload: TUpdateCommunityStatusPayload,
) => {
  const { requesterRole, targetMembership } = await resolveManagementContext(
    communityId,
    requester.id,
    userId,
  );

  if (
    !targetMembership ||
    targetMembership.role === CommunityMemberRole.OWNER
  ) {
    throw new AppError(status.NOT_FOUND, "Community member not found");
  }

  const ownerAllowed = requesterRole === CommunityMemberRole.OWNER;
  const adminAllowed =
    requesterRole === CommunityMemberRole.ADMIN &&
    targetMembership.role !== CommunityMemberRole.ADMIN;

  if (!ownerAllowed && !adminAllowed) {
    throw new AppError(status.NOT_FOUND, "Community member not found");
  }

  const transitionAllowed =
    targetMembership.status === payload.status ||
    (targetMembership.status === CommunityMemberStatus.PENDING &&
      (payload.status === CommunityMemberStatus.ACTIVE ||
        payload.status === CommunityMemberStatus.BANNED)) ||
    (targetMembership.status === CommunityMemberStatus.ACTIVE &&
      payload.status === CommunityMemberStatus.BANNED) ||
    (targetMembership.status === CommunityMemberStatus.BANNED &&
      payload.status === CommunityMemberStatus.ACTIVE);

  if (!transitionAllowed) {
    throw new AppError(status.CONFLICT, "Invalid membership status transition");
  }

  const updated = await prisma.communityMember.update({
    where: { id: targetMembership.id },
    data: { status: payload.status },
    select: CommunityMemberSelect.PUBLIC,
  });

  return mapCommunityMember(updated);
};

const removeCommunityMember = async (
  communityId: string,
  userId: string,
  requester: Express.AuthenticatedUser,
) => {
  const { requesterRole, targetMembership } = await resolveManagementContext(
    communityId,
    requester.id,
    userId,
  );

  if (
    !targetMembership ||
    targetMembership.role === CommunityMemberRole.OWNER
  ) {
    throw new AppError(status.NOT_FOUND, "Community member not found");
  }
  if (targetMembership.status === CommunityMemberStatus.BANNED) {
    throw new AppError(
      status.CONFLICT,
      "Banned membership must be managed by status",
    );
  }

  const ownerAllowed = requesterRole === CommunityMemberRole.OWNER;
  const adminAllowed =
    requesterRole === CommunityMemberRole.ADMIN &&
    targetMembership.role !== CommunityMemberRole.ADMIN;
  const moderatorAllowed =
    requesterRole === CommunityMemberRole.MODERATOR &&
    targetMembership.role === CommunityMemberRole.MEMBER &&
    targetMembership.status === CommunityMemberStatus.ACTIVE;

  if (!ownerAllowed && !adminAllowed && !moderatorAllowed) {
    throw new AppError(status.NOT_FOUND, "Community member not found");
  }

  await prisma.communityMember.deleteMany({
    where: { id: targetMembership.id },
  });
  return null;
};

export const CommunityMemberService = {
  joinCommunity,
  leaveCommunity,
  getCommunityMembers,
  updateMemberRole,
  updateMemberStatus,
  removeCommunityMember,
};
