import {
  CommunityMemberRole,
  CommunityMemberStatus,
} from "../../../src/generated/prisma/client";
import { prisma } from "../../../src/app/lib/prisma";
import type { TTestCleanup } from "../database/test-cleanup";

type TCreateTestCommunityMemberInput = {
  cleanup: TTestCleanup;
  communityId: string;
  userId: string;
  role?: CommunityMemberRole;
  status?: CommunityMemberStatus;
  joinedAt?: Date;
};

export const createTestCommunityMember = async ({
  cleanup,
  communityId,
  userId,
  role = CommunityMemberRole.MEMBER,
  status = CommunityMemberStatus.ACTIVE,
  joinedAt,
}: TCreateTestCommunityMemberInput) => {
  const member = await prisma.communityMember.create({
    data: { communityId, userId, role, status, joinedAt },
  });

  cleanup.add(`community-member:${member.id}`, () =>
    prisma.communityMember.deleteMany({ where: { id: member.id } }),
  );

  return member;
};
