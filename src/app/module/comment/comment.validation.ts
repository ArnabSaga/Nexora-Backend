import { z } from "zod";
import {
  COMMENT_CONTENT_MAX_LENGTH,
  COMMENT_DEFAULT_LIMIT,
  COMMENT_DEFAULT_PAGE,
  COMMENT_MAX_LIMIT,
} from "./comment.constant";
import { scalarPositiveIntegerQuery } from "../../shared/validation/query.validation";
import { MentionValidation } from "../mention";

const cuidSchema = z
  .string()
  .trim()
  .regex(/^c[a-z0-9]+$/i, "Invalid id");

const content = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, "Comment content is required")
      .max(COMMENT_CONTENT_MAX_LENGTH),
  );

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

const idParam = z
  .object({
    id: cuidSchema,
  })
  .strict();

const createBody = z
  .object({
    content,
    mentionedUserIds: MentionValidation.mentionedUserIds.optional(),
  })
  .strict();

const updateBody = z
  .object({
    content: content.optional(),
    mentionedUserIds: MentionValidation.mentionedUserIds.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.content !== undefined || value.mentionedUserIds !== undefined,
    { message: "At least one field is required" },
  );

const listQuery = z
  .object({
    page: scalarPositiveIntegerQuery({
      min: 1,
      max: Number.MAX_SAFE_INTEGER,
    }).default(COMMENT_DEFAULT_PAGE),
    limit: scalarPositiveIntegerQuery({
      min: 1,
      max: COMMENT_MAX_LIMIT,
    }).default(COMMENT_DEFAULT_LIMIT),
  })
  .strict();

export const CommentValidation = {
  postIdParam,
  commentIdParam,
  idParam,
  createBody,
  updateBody,
  listQuery,
};
