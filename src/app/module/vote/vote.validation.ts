import { z } from "zod";
import { ALLOWED_VOTE_TYPES } from "./vote.constant";

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

const voteBody = z
  .object({
    voteType: z.enum(ALLOWED_VOTE_TYPES),
  })
  .strict();

export const VoteValidation = {
  postVote: {
    params: postIdParam,
    body: voteBody,
  },
  deletePostVote: {
    params: postIdParam,
  },
  commentVote: {
    params: commentIdParam,
    body: voteBody,
  },
  deleteCommentVote: {
    params: commentIdParam,
  },
};
