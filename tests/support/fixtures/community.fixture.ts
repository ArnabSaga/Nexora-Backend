import {
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityVisibility,
} from "../../../src/generated/prisma/client";
import { prisma } from "../../../src/app/lib/prisma";
import type { TTestCleanup } from "../database/test-cleanup";

type TCreateTestCommunityInput = {
  cleanup: TTestCleanup;
  runId: string;
  ownerId: string;
  label: string;
  visibility?: CommunityVisibility;
  isSuspended?: boolean;
  deletedAt?: Date | null;
  createdAt?: Date;
};

export const createTestCommunity = async ({
  cleanup,
  runId,
  ownerId,
  label,
  visibility = CommunityVisibility.PUBLIC,
  isSuspended = false,
  deletedAt,
  createdAt,
}: TCreateTestCommunityInput) => {
  const community = await prisma.community.create({
    data: {
      ownerId,
      name: `${runId} ${label}`,
      slug: `${runId}-${label}`,
      visibility,
      isSuspended,
      deletedAt,
      createdAt,
    },
  });

  cleanup.add(`community:${community.id}`, () =>
    prisma.community.deleteMany({ where: { id: community.id } }),
  );

  return community;
};

export const createTestCommunityWithOwnerMembership = async (
  input: TCreateTestCommunityInput,
) => {
  const community = await prisma.community.create({
    data: {
      ownerId: input.ownerId,
      name: `${input.runId} ${input.label}`,
      slug: `${input.runId}-${input.label}`,
      visibility: input.visibility ?? CommunityVisibility.PUBLIC,
      isSuspended: input.isSuspended ?? false,
      deletedAt: input.deletedAt,
      createdAt: input.createdAt,
      members: {
        create: {
          userId: input.ownerId,
          role: CommunityMemberRole.OWNER,
          status: CommunityMemberStatus.ACTIVE,
        },
      },
    },
    include: {
      members: {
        where: { userId: input.ownerId },
      },
    },
  });

  input.cleanup.add(`community:${community.id}`, () =>
    prisma.community.deleteMany({ where: { id: community.id } }),
  );

  return community;
};
