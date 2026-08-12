import { prisma } from "../../../src/app/lib/prisma";
import type { TTestCleanup } from "../database/test-cleanup";

type TCreateTestBookmarkInput = {
  cleanup: TTestCleanup;
  userId: string;
  postId: string;
  createdAt?: Date;
};

export const createTestBookmark = async ({
  cleanup,
  userId,
  postId,
  createdAt,
}: TCreateTestBookmarkInput) => {
  const bookmark = await prisma.bookmark.create({
    data: { userId, postId, createdAt },
  });

  cleanup.add(`bookmark:${bookmark.id}`, () =>
    prisma.bookmark.deleteMany({ where: { id: bookmark.id } }),
  );

  return bookmark;
};
