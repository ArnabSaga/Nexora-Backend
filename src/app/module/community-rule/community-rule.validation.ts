import { z } from "zod";
import {
  COMMUNITY_RULE_MAX_DESCRIPTION_LENGTH,
  COMMUNITY_RULE_MAX_ORDER,
  COMMUNITY_RULE_MAX_TITLE_LENGTH,
  COMMUNITY_RULE_MIN_ORDER,
} from "./community-rule.constant";

const communityIdParam = z
  .object({
    communityId: z.cuid({ error: "Invalid community id" }),
  })
  .strict();

const ruleIdParam = z
  .object({
    ruleId: z.cuid({ error: "Invalid community rule id" }),
  })
  .strict();

const title = z.string().trim().min(1).max(COMMUNITY_RULE_MAX_TITLE_LENGTH);

const description = z
  .string()
  .trim()
  .max(COMMUNITY_RULE_MAX_DESCRIPTION_LENGTH)
  .nullable()
  .optional();

const orderNo = z
  .number()
  .int()
  .safe()
  .min(COMMUNITY_RULE_MIN_ORDER)
  .max(COMMUNITY_RULE_MAX_ORDER);

const create = z
  .object({
    title,
    description,
    orderNo: orderNo.optional().default(COMMUNITY_RULE_MIN_ORDER),
  })
  .strict();

const update = z
  .object({
    title: title.optional(),
    description,
    orderNo: orderNo.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const emptyQuery = z.object({}).strict();

export const CommunityRuleValidation = {
  communityIdParam,
  ruleIdParam,
  create,
  update,
  emptyQuery,
};
