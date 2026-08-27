import status from "http-status";
import {
  CommunityMemberStatus,
  type Prisma,
  type UserRole,
} from "../../../generated/prisma/client";
import AppError from "../../shared/errors/AppError";
import { AVAILABLE_COMMUNITY_WHERE } from "../../shared/policies/community.policy";
import {
  COMMUNITY_MODERATION_ROLES,
  PLATFORM_GLOBAL_CONTENT_MODERATION_ROLES,
  PLATFORM_REPORT_REVIEW_ROLES,
} from "./moderation.constant";
import type { TModerationPrincipal } from "./moderation.interface";

export const canReviewReports = (role: UserRole): boolean =>
  PLATFORM_REPORT_REVIEW_ROLES.some((allowedRole) => allowedRole === role);

export const assertCanReviewReports = (
  requester: TModerationPrincipal,
): void => {
  if (!canReviewReports(requester.role)) {
    throw new AppError(
      status.FORBIDDEN,
      "You are not allowed to access this resource",
    );
  }
};

export const hasGlobalContentModerationAuthority = (role: UserRole): boolean =>
  PLATFORM_GLOBAL_CONTENT_MODERATION_ROLES.some(
    (allowedRole) => allowedRole === role,
  );

export const buildCommunityModerationWhere = (
  userId: string,
): Prisma.CommunityWhereInput => ({
  AND: [
    AVAILABLE_COMMUNITY_WHERE,
    {
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId,
              status: CommunityMemberStatus.ACTIVE,
              role: { in: [...COMMUNITY_MODERATION_ROLES] },
            },
          },
        },
      ],
    },
  ],
});
