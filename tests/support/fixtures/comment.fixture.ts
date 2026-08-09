import { prisma } from "../../../src/app/lib/prisma";
import type { TTestCleanup } from "../database/test-cleanup";

type TCreateTestCommentInput = {
  cleanup: TTestCleanup;
  runId: string;
  postId: string;
  authorId: string;
  parentCommentId?: string;
  isDeleted?: boolean;
  label?: string;
};

export const createTestComment = async ({
  cleanup,
  runId,
  postId,
  authorId,
  parentCommentId,
  isDeleted = false,
  label = "comment",
}: TCreateTestCommentInput) => {
  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId,
      parentCommentId,
      content: `${runId} ${label}`,
      isDeleted,
    },
  });

  cleanup.add(`comment:${comment.id}`, () =>
    prisma.comment.deleteMany({ where: { id: comment.id } }),
  );

  return comment;
};
