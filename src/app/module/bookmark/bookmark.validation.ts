import { z } from "zod";
import { scalarPositiveIntegerQuery } from "../../shared/validation/query.validation";
import { BOOKMARK_MAX_LIMIT } from "./bookmark.constant";

const postIdParam = z
  .object({
    postId: z.cuid({ error: "Invalid post id" }),
  })
  .strict();

const listQuery = z
  .object({
    cursor: z.string().min(1).optional(),
    limit: scalarPositiveIntegerQuery({
      min: 1,
      max: BOOKMARK_MAX_LIMIT,
    }).optional(),
  })
  .strict();

export const BookmarkValidation = {
  postIdParam,
  listQuery,
};
