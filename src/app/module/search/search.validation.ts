import { z } from "zod";
import { scalarPositiveIntegerQuery } from "../../shared/validation/query.validation";
import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_DEFAULT_PAGE,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_PAGE,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_TYPES,
} from "./search.constant";

const query = z
  .string()
  .trim()
  .min(SEARCH_MIN_QUERY_LENGTH)
  .max(SEARCH_MAX_QUERY_LENGTH);
const page = scalarPositiveIntegerQuery({
  min: 1,
  max: SEARCH_MAX_PAGE,
}).default(SEARCH_DEFAULT_PAGE);
const limit = scalarPositiveIntegerQuery({
  min: 1,
  max: SEARCH_MAX_LIMIT,
}).default(SEARCH_DEFAULT_LIMIT);

const dedicatedQuery = z.object({ query, page, limit }).strict();
const globalQuery = z
  .object({ query, type: z.enum(SEARCH_TYPES).optional(), page, limit })
  .strict();

export const SearchValidation = { globalQuery, dedicatedQuery };
