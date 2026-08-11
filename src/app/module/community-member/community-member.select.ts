import type { Prisma } from "../../../generated/prisma/client";
import { DEFAULT_USER_SELECT } from "../user/user.constant";

const PUBLIC = {
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

export const CommunityMemberSelect = {
  PUBLIC,
} as const;

export type TCommunityMemberPayload = Prisma.CommunityMemberGetPayload<{
  select: typeof CommunityMemberSelect.PUBLIC;
}>;
