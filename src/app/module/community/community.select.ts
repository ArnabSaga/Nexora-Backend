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

export const CommunitySelect = {
  PUBLIC,
} as const;

export type TCommunityPayload = Prisma.CommunityGetPayload<{
  select: typeof CommunitySelect.PUBLIC;
}>;
