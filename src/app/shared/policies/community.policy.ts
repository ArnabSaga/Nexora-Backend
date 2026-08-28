import {
  CommunityMemberStatus,
  CommunityVisibility,
} from "../../../generated/prisma/client";
import type { Prisma } from "../../../generated/prisma/client";
import { ACTIVE_PUBLIC_USER_WHERE } from "./user.policy";

export const AVAILABLE_COMMUNITY_WHERE = {
  deletedAt: null,
  isSuspended: false,
} satisfies Prisma.CommunityWhereInput;

export const PUBLIC_COMMUNITY_MEMBER_WHERE = {
  status: CommunityMemberStatus.ACTIVE,
  user: {
    is: ACTIVE_PUBLIC_USER_WHERE,
  },
} satisfies Prisma.CommunityMemberWhereInput;

export const buildActiveCommunityMembershipWhere = (
  userId: string,
): Prisma.CommunityMemberWhereInput => ({
  userId,
  status: CommunityMemberStatus.ACTIVE,
});

export const buildReadableCommunityWhere = (
  viewer?: Express.AuthenticatedUser,
): Prisma.CommunityWhereInput => {
  const publiclyReadable = {
    visibility: {
      in: [CommunityVisibility.PUBLIC, CommunityVisibility.RESTRICTED],
    },
  } satisfies Prisma.CommunityWhereInput;

  if (!viewer) {
    return {
      ...AVAILABLE_COMMUNITY_WHERE,
      ...publiclyReadable,
    };
  }

  return {
    ...AVAILABLE_COMMUNITY_WHERE,
    OR: [
      publiclyReadable,
      { ownerId: viewer.id },
      {
        members: {
          some: buildActiveCommunityMembershipWhere(viewer.id),
        },
      },
    ],
  };
};

export const buildCommunityParticipationWhere = (
  userId: string,
): Prisma.CommunityWhereInput => ({
  OR: [
    { ownerId: userId },
    {
      members: {
        some: buildActiveCommunityMembershipWhere(userId),
      },
    },
  ],
});

export const buildAvailableParticipationWhere = (
  userId: string,
): Prisma.CommunityWhereInput => ({
  ...AVAILABLE_COMMUNITY_WHERE,
  ...buildCommunityParticipationWhere(userId),
});
