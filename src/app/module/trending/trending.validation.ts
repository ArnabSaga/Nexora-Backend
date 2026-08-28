import { z } from "zod";
import { scalarPositiveIntegerQuery } from "../../shared/validation/query.validation";
import {
  TRENDING_DEFAULT_LIMIT,
  TRENDING_DEFAULT_PAGE,
  TRENDING_MAX_LIMIT,
  TRENDING_MAX_PAGE,
} from "./trending.constant";

const postQuery = z
  .object({
    page: scalarPositiveIntegerQuery({
      min: 1,
      max: TRENDING_MAX_PAGE,
    }).default(TRENDING_DEFAULT_PAGE),
    limit: scalarPositiveIntegerQuery({
      min: 1,
      max: TRENDING_MAX_LIMIT,
    }).default(TRENDING_DEFAULT_LIMIT),
  })
  .strict();

export const TrendingValidation = { postQuery };
