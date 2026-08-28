import { PostVisibility } from "../../../src/generated/prisma/client";
import { prisma } from "../../../src/app/lib/prisma";
import type { TTestCleanup } from "../database/test-cleanup";

type TCreateTestPostInput = {
  cleanup: TTestCleanup;
  runId: string;
  authorId: string;
  visibility?: PostVisibility;
  repostId?: string;
  communityId?: string;
  createdAt?: Date;
  content?: string;
};

export const createTestPost = async ({
  cleanup,
  runId,
  authorId,
  visibility = PostVisibility.PUBLIC,
  repostId,
  communityId,
  createdAt,
  content,
}: TCreateTestPostInput) => {
  const post = await prisma.post.create({
    data: {
      authorId,
      content: content ?? `${runId} post`,
      visibility,
      repostId,
      communityId,
      createdAt,
    },
  });

  cleanup.add(`post:${post.id}`, () =>
    prisma.post.deleteMany({ where: { id: post.id } }),
  );

  return post;
};
