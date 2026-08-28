import { z } from "zod";
import { scalarPositiveIntegerQuery } from "../../shared/validation/query.validation";
import { HASHTAG_MAX_LENGTH } from "../../shared/hashtags/hashtag.constant";
import { HASHTAG_MAX_LIMIT } from "./hashtag.constant";

const limit = scalarPositiveIntegerQuery({ min: 1, max: HASHTAG_MAX_LIMIT });

const trendingQuery = z.object({ limit: limit.optional() }).strict();
const postListQuery = z
  .object({ cursor: z.string().min(1).optional(), limit: limit.optional() })
  .strict();
const tagParam = z
  .object({
    tag: z
      .string()
      .regex(
        new RegExp(`^[A-Za-z0-9_]{1,${HASHTAG_MAX_LENGTH}}$`),
        "Invalid hashtag",
      )
      .transform((value) => value.toLowerCase()),
  })
  .strict();

export const HashtagValidation = { trendingQuery, postListQuery, tagParam };
