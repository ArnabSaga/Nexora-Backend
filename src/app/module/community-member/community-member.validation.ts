import { z } from "zod";
import {
  CommunityMemberRole,
  CommunityMemberStatus,
} from "../../../generated/prisma/client";
import { scalarPositiveIntegerQuery } from "../../shared/validation/query.validation";
import {
  COMMUNITY_DEFAULT_PAGE,
  COMMUNITY_MAX_LIMIT,
  COMMUNITY_MAX_PAGE,
} from "../community/community.constant";

const cuidSchema = z.cuid({ error: "Invalid community id" });
const userCuidSchema = z.cuid({ error: "Invalid user id" });

const idParam = z.object({ id: cuidSchema }).strict();
const memberParam = z
  .object({ communityId: cuidSchema, userId: userCuidSchema })
  .strict();

const memberListQuery = z
  .object({
    page: scalarPositiveIntegerQuery({
      min: COMMUNITY_DEFAULT_PAGE,
      max: COMMUNITY_MAX_PAGE,
    }).optional(),
    limit: scalarPositiveIntegerQuery({
      min: 1,
      max: COMMUNITY_MAX_LIMIT,
    }).optional(),
    status: z.enum(CommunityMemberStatus).optional(),
  })
  .strict();

const updateRole = z
  .object({
    role: z.enum([
      CommunityMemberRole.ADMIN,
      CommunityMemberRole.MODERATOR,
      CommunityMemberRole.MEMBER,
    ]),
  })
  .strict();

const updateStatus = z
  .object({
    status: z.enum([
      CommunityMemberStatus.ACTIVE,
      CommunityMemberStatus.BANNED,
    ]),
  })
  .strict();

export const CommunityMemberValidation = {
  idParam,
  memberParam,
  memberListQuery,
  updateRole,
  updateStatus,
};
