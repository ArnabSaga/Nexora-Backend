import { prisma } from "../../../src/app/lib/prisma";
import type { TTestCleanup } from "../database/test-cleanup";

type TCreateTestFollowInput = {
  cleanup: TTestCleanup;
  followerId: string;
  followingId: string;
  createdAt?: Date;
};

export const createTestFollow = async ({
  cleanup,
  followerId,
  followingId,
  createdAt,
}: TCreateTestFollowInput) => {
  const follow = await prisma.follow.create({
    data: { followerId, followingId, createdAt },
  });

  cleanup.add(`follow:${follow.id}`, () =>
    prisma.follow.deleteMany({ where: { id: follow.id } }),
  );

  return follow;
};
