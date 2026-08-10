import { CommunityVisibility } from "../../../src/generated/prisma/client";
import { prisma } from "../../../src/app/lib/prisma";
import type { TTestCleanup } from "../database/test-cleanup";

type TCreateTestCommunityInput = {
  cleanup: TTestCleanup;
  runId: string;
  ownerId: string;
  label: string;
  visibility?: CommunityVisibility;
  isSuspended?: boolean;
};

export const createTestCommunity = async ({
  cleanup,
  runId,
  ownerId,
  label,
  visibility = CommunityVisibility.PUBLIC,
  isSuspended = false,
}: TCreateTestCommunityInput) => {
  const community = await prisma.community.create({
    data: {
      ownerId,
      name: `${runId} ${label}`,
      slug: `${runId}-${label}`,
      visibility,
      isSuspended,
    },
  });

  cleanup.add(`community:${community.id}`, () =>
    prisma.community.deleteMany({ where: { id: community.id } }),
  );

  return community;
};
