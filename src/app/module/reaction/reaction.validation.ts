import { z } from "zod";
import { ALLOWED_REACTION_TYPES } from "./reaction.constant";

const cuidSchema = z.cuid({
  error: "Invalid id",
});

const postIdParam = z
  .object({
    postId: cuidSchema,
  })
  .strict();

const commentIdParam = z
  .object({
    commentId: cuidSchema,
  })
  .strict();

const reactionBody = z
  .object({
    reactionType: z.enum(ALLOWED_REACTION_TYPES),
  })
  .strict();

const postReaction = {
  params: postIdParam,
  body: reactionBody,
};

const deletePostReaction = {
  params: postIdParam,
};

const commentReaction = {
  params: commentIdParam,
  body: reactionBody,
};

const deleteCommentReaction = {
  params: commentIdParam,
};

export const ReactionValidation = {
  postReaction,
  deletePostReaction,
  commentReaction,
  deleteCommentReaction,
};
