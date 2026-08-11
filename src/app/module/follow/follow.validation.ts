import { z } from "zod";
import { scalarPositiveIntegerQuery } from "../../shared/validation/query.validation";
import {
  FOLLOW_DEFAULT_PAGE,
  FOLLOW_MAX_LIMIT,
  FOLLOW_MAX_PAGE,
} from "./follow.constant";

const cuidSchema = z.cuid({
  error: "Invalid user id",
});

const userIdParam = z
  .object({
    userId: cuidSchema,
  })
  .strict();

const listQuery = z
  .object({
    page: scalarPositiveIntegerQuery({
      min: FOLLOW_DEFAULT_PAGE,
      max: FOLLOW_MAX_PAGE,
    }).optional(),
    limit: scalarPositiveIntegerQuery({
      min: 1,
      max: FOLLOW_MAX_LIMIT,
    }).optional(),
  })
  .strict();

export const FollowValidation = {
  userIdParam,
  listQuery,
};
