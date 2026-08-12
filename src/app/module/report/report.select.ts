import type { Prisma } from "../../../generated/prisma/client";

export const REPORT_USER_SUMMARY_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

const REPORT_COMMON_SELECT = {
  id: true,
  reporterId: true,
  reason: true,
  details: true,
  status: true,
  reviewedById: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  reporter: { select: REPORT_USER_SUMMARY_SELECT },
  reviewedBy: { select: REPORT_USER_SUMMARY_SELECT },
} as const;

export const USER_REPORT_SELECT = {
  ...REPORT_COMMON_SELECT,
  reportedUserId: true,
  reportedUser: { select: REPORT_USER_SUMMARY_SELECT },
} satisfies Prisma.UserReportSelect;

export const POST_REPORT_SELECT = {
  ...REPORT_COMMON_SELECT,
  postId: true,
  post: {
    select: {
      id: true,
      authorId: true,
      communityId: true,
      content: true,
      visibility: true,
      isDeleted: true,
      author: { select: REPORT_USER_SUMMARY_SELECT },
    },
  },
} satisfies Prisma.PostReportSelect;

export const COMMENT_REPORT_SELECT = {
  ...REPORT_COMMON_SELECT,
  commentId: true,
  comment: {
    select: {
      id: true,
      authorId: true,
      postId: true,
      content: true,
      isDeleted: true,
      author: { select: REPORT_USER_SUMMARY_SELECT },
    },
  },
} satisfies Prisma.CommentReportSelect;

export const COMMUNITY_REPORT_SELECT = {
  ...REPORT_COMMON_SELECT,
  communityId: true,
  community: {
    select: {
      id: true,
      ownerId: true,
      name: true,
      slug: true,
      description: true,
      visibility: true,
      isSuspended: true,
      deletedAt: true,
      owner: { select: REPORT_USER_SUMMARY_SELECT },
    },
  },
} satisfies Prisma.CommunityReportSelect;

export type TUserReportPayload = Prisma.UserReportGetPayload<{
  select: typeof USER_REPORT_SELECT;
}>;
export type TPostReportPayload = Prisma.PostReportGetPayload<{
  select: typeof POST_REPORT_SELECT;
}>;
export type TCommentReportPayload = Prisma.CommentReportGetPayload<{
  select: typeof COMMENT_REPORT_SELECT;
}>;
export type TCommunityReportPayload = Prisma.CommunityReportGetPayload<{
  select: typeof COMMUNITY_REPORT_SELECT;
}>;
