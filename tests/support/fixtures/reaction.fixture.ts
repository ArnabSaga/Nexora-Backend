import { ReactionType } from "../../../src/generated/prisma/client";
import { prisma } from "../../../src/app/lib/prisma";
import type { TTestCleanup } from "../database/test-cleanup";

type TCreatePostReactionInput = {
  cleanup: TTestCleanup;
  userId: string;
  postId: string;
  reactionType?: ReactionType;
};

type TCreateCommentReactionInput = {
  cleanup: TTestCleanup;
  userId: string;
  commentId: string;
  reactionType?: ReactionType;
};

export const createTestPostReaction = async ({
  cleanup,
  userId,
  postId,
  reactionType = ReactionType.LIKE,
}: TCreatePostReactionInput) => {
  const reaction = await prisma.postReaction.create({
    data: { userId, postId, reactionType },
  });

  cleanup.add(`post-reaction:${reaction.id}`, () =>
    prisma.postReaction.deleteMany({ where: { id: reaction.id } }),
  );

  return reaction;
};

export const createTestCommentReaction = async ({
  cleanup,
  userId,
  commentId,
  reactionType = ReactionType.LIKE,
}: TCreateCommentReactionInput) => {
  const reaction = await prisma.commentReaction.create({
    data: { userId, commentId, reactionType },
  });

  cleanup.add(`comment-reaction:${reaction.id}`, () =>
    prisma.commentReaction.deleteMany({ where: { id: reaction.id } }),
  );

  return reaction;
};
