import {
  CommunityMemberRole,
  UserRole,
} from "../../../generated/prisma/client";

export const PLATFORM_REPORT_REVIEW_ROLES = [
  UserRole.MODERATOR,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
] as const;

export const PLATFORM_GLOBAL_CONTENT_MODERATION_ROLES = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
] as const;

export const COMMUNITY_MODERATION_ROLES = [
  CommunityMemberRole.OWNER,
  CommunityMemberRole.ADMIN,
  CommunityMemberRole.MODERATOR,
] as const;
