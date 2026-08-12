import { prisma } from "../../../src/app/lib/prisma";
import type { TTestCleanup } from "../database/test-cleanup";

type TCreateTestCommunityRuleInput = {
  cleanup: TTestCleanup;
  communityId: string;
  title: string;
  description?: string | null;
  orderNo?: number;
  createdAt?: Date;
};

export const createTestCommunityRule = async ({
  cleanup,
  communityId,
  title,
  description,
  orderNo = 0,
  createdAt,
}: TCreateTestCommunityRuleInput) => {
  const rule = await prisma.communityRule.create({
    data: {
      communityId,
      title,
      description,
      orderNo,
      createdAt,
    },
  });

  cleanup.add("community-rule:" + rule.id, () =>
    prisma.communityRule.deleteMany({ where: { id: rule.id } }),
  );

  return rule;
};
