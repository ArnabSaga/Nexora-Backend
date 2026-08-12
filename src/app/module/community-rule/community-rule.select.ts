import type { Prisma } from "../../../generated/prisma/client";

export const COMMUNITY_RULE_SELECT = {
  id: true,
  communityId: true,
  title: true,
  description: true,
  orderNo: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CommunityRuleSelect;

export type TCommunityRulePayload = Prisma.CommunityRuleGetPayload<{
  select: typeof COMMUNITY_RULE_SELECT;
}>;
