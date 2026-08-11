import type { Prisma } from "../../../generated/prisma/client";
import { PUBLIC_COMMUNITY_MEMBER_WHERE } from "../../shared/policies/community.policy";
import { DEFAULT_USER_SELECT } from "../user/user.constant";

const PUBLIC = {
  id: true,
  ownerId: true,
  name: true,
  slug: true,
  description: true,
  avatar: true,
  coverPhoto: true,
  visibility: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: DEFAULT_USER_SELECT,
  },
  _count: {
    select: {
      members: {
        where: PUBLIC_COMMUNITY_MEMBER_WHERE,
      },
    },
  },
} satisfies Prisma.CommunitySelect;

const MEMBER = {
  id: true,
  communityId: true,
  userId: true,
  role: true,
  status: true,
  joinedAt: true,
  user: {
    select: DEFAULT_USER_SELECT,
  },
} satisfies Prisma.CommunityMemberSelect;

export const CommunitySelect = {
  PUBLIC,
  MEMBER,
} as const;

export type TCommunityPayload = Prisma.CommunityGetPayload<{
  select: typeof CommunitySelect.PUBLIC;
}>;

export type TCommunityMemberPayload = Prisma.CommunityMemberGetPayload<{
  select: typeof CommunitySelect.MEMBER;
}>;
