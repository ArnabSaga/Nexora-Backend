import {
  Prisma,
  ReportStatus,
  UserStatus,
} from "../../../generated/prisma/client";
import type {
  TAdminReader,
  TNormalizedAdminCommunityQuery,
  TNormalizedAdminPostQuery,
} from "./admin.interface";
import { mapAdminCommunity, mapAdminPost } from "./admin.mapper";
import { ADMIN_COMMUNITY_SELECT, ADMIN_POST_SELECT } from "./admin.select";

export type TAdminPrismaClient = Pick<
  Prisma.TransactionClient,
  | "user"
  | "post"
  | "community"
  | "userReport"
  | "postReport"
  | "commentReport"
  | "communityReport"
>;

const entityOrderBy = [{ createdAt: "desc" }, { id: "desc" }] as const;

export const buildAdminPostWhere = (
  query: TNormalizedAdminPostQuery,
): Prisma.PostWhereInput => ({
  ...(query.authorId && { authorId: query.authorId }),
  ...(query.communityId && { communityId: query.communityId }),
  ...(query.visibility && { visibility: query.visibility }),
  ...(query.state === "ACTIVE" && { isDeleted: false }),
  ...(query.state === "DELETED" && { isDeleted: true }),
  ...(query.patternSearchTerm && {
    content: {
      contains: query.patternSearchTerm,
      mode: "insensitive",
    },
  }),
});

export const buildAdminCommunityWhere = (
  query: TNormalizedAdminCommunityQuery,
): Prisma.CommunityWhereInput => ({
  ...(query.ownerId && { ownerId: query.ownerId }),
  ...(query.visibility && { visibility: query.visibility }),
  ...(query.state === "ACTIVE" && {
    deletedAt: null,
    isSuspended: false,
  }),
  ...(query.state === "SUSPENDED" && {
    deletedAt: null,
    isSuspended: true,
  }),
  ...(query.state === "DELETED" && { deletedAt: { not: null } }),
  ...(query.patternSearchTerm && {
    OR: [
      {
        name: {
          contains: query.patternSearchTerm,
          mode: "insensitive",
        },
      },
      {
        slug: {
          contains: query.patternSearchTerm,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: query.patternSearchTerm,
          mode: "insensitive",
        },
      },
    ],
  }),
});

export const createPrismaAdminReader = (
  client: TAdminPrismaClient,
): TAdminReader => ({
  getDashboard: async () => {
    const [
      activeUsers,
      suspendedUsers,
      deletedUsers,
      activePosts,
      deletedPosts,
      activeCommunities,
      suspendedCommunities,
      deletedCommunities,
      pendingUserReports,
      pendingPostReports,
      pendingCommentReports,
      pendingCommunityReports,
      reviewedUserReports,
      reviewedPostReports,
      reviewedCommentReports,
      reviewedCommunityReports,
      resolvedUserReports,
      resolvedPostReports,
      resolvedCommentReports,
      resolvedCommunityReports,
      rejectedUserReports,
      rejectedPostReports,
      rejectedCommentReports,
      rejectedCommunityReports,
    ] = await Promise.all([
      client.user.count({
        where: { status: UserStatus.ACTIVE, deletedAt: null },
      }),
      client.user.count({
        where: { status: UserStatus.SUSPENDED, deletedAt: null },
      }),
      client.user.count({
        where: {
          OR: [{ status: UserStatus.DELETED }, { deletedAt: { not: null } }],
        },
      }),
      client.post.count({ where: { isDeleted: false } }),
      client.post.count({ where: { isDeleted: true } }),
      client.community.count({
        where: { deletedAt: null, isSuspended: false },
      }),
      client.community.count({
        where: { deletedAt: null, isSuspended: true },
      }),
      client.community.count({ where: { deletedAt: { not: null } } }),
      client.userReport.count({ where: { status: ReportStatus.PENDING } }),
      client.postReport.count({ where: { status: ReportStatus.PENDING } }),
      client.commentReport.count({ where: { status: ReportStatus.PENDING } }),
      client.communityReport.count({
        where: { status: ReportStatus.PENDING },
      }),
      client.userReport.count({ where: { status: ReportStatus.REVIEWED } }),
      client.postReport.count({ where: { status: ReportStatus.REVIEWED } }),
      client.commentReport.count({ where: { status: ReportStatus.REVIEWED } }),
      client.communityReport.count({
        where: { status: ReportStatus.REVIEWED },
      }),
      client.userReport.count({ where: { status: ReportStatus.RESOLVED } }),
      client.postReport.count({ where: { status: ReportStatus.RESOLVED } }),
      client.commentReport.count({ where: { status: ReportStatus.RESOLVED } }),
      client.communityReport.count({
        where: { status: ReportStatus.RESOLVED },
      }),
      client.userReport.count({ where: { status: ReportStatus.REJECTED } }),
      client.postReport.count({ where: { status: ReportStatus.REJECTED } }),
      client.commentReport.count({ where: { status: ReportStatus.REJECTED } }),
      client.communityReport.count({
        where: { status: ReportStatus.REJECTED },
      }),
    ]);

    const pending =
      pendingUserReports +
      pendingPostReports +
      pendingCommentReports +
      pendingCommunityReports;
    const reviewed =
      reviewedUserReports +
      reviewedPostReports +
      reviewedCommentReports +
      reviewedCommunityReports;
    const resolved =
      resolvedUserReports +
      resolvedPostReports +
      resolvedCommentReports +
      resolvedCommunityReports;
    const rejected =
      rejectedUserReports +
      rejectedPostReports +
      rejectedCommentReports +
      rejectedCommunityReports;

    return {
      users: {
        total: activeUsers + suspendedUsers + deletedUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        deleted: deletedUsers,
      },
      posts: {
        total: activePosts + deletedPosts,
        active: activePosts,
        deleted: deletedPosts,
      },
      communities: {
        total: activeCommunities + suspendedCommunities + deletedCommunities,
        active: activeCommunities,
        suspended: suspendedCommunities,
        deleted: deletedCommunities,
      },
      reports: {
        total: pending + reviewed + resolved + rejected,
        pending,
        reviewed,
        resolved,
        rejected,
      },
    };
  },

  getPosts: async (query) => {
    const where = buildAdminPostWhere(query);
    const [total, rows] = await Promise.all([
      client.post.count({ where }),
      client.post.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [...entityOrderBy],
        select: ADMIN_POST_SELECT,
      }),
    ]);
    return {
      data: rows.map(mapAdminPost),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  getCommunities: async (query) => {
    const where = buildAdminCommunityWhere(query);
    const [total, rows] = await Promise.all([
      client.community.count({ where }),
      client.community.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [...entityOrderBy],
        select: ADMIN_COMMUNITY_SELECT,
      }),
    ]);
    return {
      data: rows.map(mapAdminCommunity),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },
});
