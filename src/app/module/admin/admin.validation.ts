import { z } from "zod";
import {
  CommunityVisibility,
  PostVisibility,
} from "../../../generated/prisma/client";
import { scalarPositiveIntegerQuery } from "../../shared/validation/query.validation";
import {
  ADMIN_COMMUNITY_STATES,
  ADMIN_COMMUNITY_STATUSES,
  ADMIN_DEFAULT_PAGE,
  ADMIN_MAX_LIMIT,
  ADMIN_MAX_PAGE,
  ADMIN_MAX_SEARCH_LENGTH,
  ADMIN_MIN_SEARCH_LENGTH,
  ADMIN_POST_STATES,
} from "./admin.constant";

const pagination = {
  page: scalarPositiveIntegerQuery({
    min: ADMIN_DEFAULT_PAGE,
    max: ADMIN_MAX_PAGE,
  }).optional(),
  limit: scalarPositiveIntegerQuery({
    min: 1,
    max: ADMIN_MAX_LIMIT,
  }).optional(),
};
const searchTerm = z
  .string()
  .trim()
  .min(ADMIN_MIN_SEARCH_LENGTH)
  .max(ADMIN_MAX_SEARCH_LENGTH)
  .optional();
const cuid = z.cuid({ error: "Invalid id" });

const postList = z
  .object({
    ...pagination,
    searchTerm,
    authorId: cuid.optional(),
    communityId: cuid.optional(),
    visibility: z.enum(PostVisibility).optional(),
    state: z.enum(ADMIN_POST_STATES).optional(),
  })
  .strict();

const communityList = z
  .object({
    ...pagination,
    searchTerm,
    ownerId: cuid.optional(),
    visibility: z.enum(CommunityVisibility).optional(),
    state: z.enum(ADMIN_COMMUNITY_STATES).optional(),
  })
  .strict();

const communityIdParam = z.object({ id: cuid }).strict();
const communityStatus = z
  .object({ status: z.enum(ADMIN_COMMUNITY_STATUSES) })
  .strict();
const emptyQuery = z.object({}).strict();

export const AdminValidation = {
  emptyQuery,
  postList,
  communityList,
  communityIdParam,
  communityStatus,
};
