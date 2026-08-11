import { z } from "zod";
import { CommunityVisibility } from "../../../generated/prisma/client";
import { scalarPositiveIntegerQuery } from "../../shared/validation/query.validation";
import {
  COMMUNITY_DEFAULT_PAGE,
  COMMUNITY_MAX_LIMIT,
  COMMUNITY_MAX_PAGE,
} from "./community.constant";

const cuidSchema = z.cuid({ error: "Invalid community id" });

const idParam = z.object({ id: cuidSchema }).strict();
const slugParam = z
  .object({
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid community slug"),
  })
  .strict();
const pagination = {
  page: scalarPositiveIntegerQuery({
    min: COMMUNITY_DEFAULT_PAGE,
    max: COMMUNITY_MAX_PAGE,
  }).optional(),
  limit: scalarPositiveIntegerQuery({
    min: 1,
    max: COMMUNITY_MAX_LIMIT,
  }).optional(),
};

const listQuery = z.object(pagination).strict();

const create = z
  .object({
    name: z.string().trim().min(3).max(80),
    description: z.string().trim().max(1000).nullable().optional(),
    visibility: z.enum(CommunityVisibility).optional(),
  })
  .strict();

const update = create
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const CommunityValidation = {
  idParam,
  slugParam,
  listQuery,
  create,
  update,
};
