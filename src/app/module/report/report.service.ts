import status from "http-status";
import {
  Prisma,
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import { DISPLAYABLE_POST_COMMENT_WHERE } from "../../shared/policies/comment.policy";
import { buildReadableCommunityWhere } from "../../shared/policies/community.policy";
import { ACTIVE_PUBLIC_USER_WHERE } from "../../shared/policies/user.policy";
import { PostVisibilityService } from "../post/services/post-visibility.service";
import { assertCanReviewReports } from "../moderation";
import {
  REPORT_DEFAULT_LIMIT,
  REPORT_EXCERPT_LENGTH,
  REPORT_MAX_DETAILS_LENGTH,
  REPORT_MAX_LIMIT,
  REPORT_TRANSACTION_MAX_ATTEMPTS,
} from "./report.constant";
import { decodeReportCursor, encodeReportCursor } from "./report.cursor";
import type {
  TCreateReportPayload,
  TReportListQuery,
  TReportResponse,
  TReportSummary,
  TReportTargetSummary,
  TReportUserSummary,
  TUnifiedReportRow,
} from "./report.interface";
import { buildReportCursorBoundary, mergeReportRows } from "./report-merge";
import {
  COMMENT_REPORT_SELECT,
  COMMUNITY_REPORT_SELECT,
  POST_REPORT_SELECT,
  USER_REPORT_SELECT,
  type TCommentReportPayload,
  type TCommunityReportPayload,
  type TPostReportPayload,
  type TUserReportPayload,
} from "./report.select";
import { rethrowReportCreateError } from "./report-prisma-error";
import { createReportStatusService } from "./report-status.factory";
import type { TReportTransition } from "./report-status.factory";

const ACTIVE_REPORT_STATUSES = [
  ReportStatus.PENDING,
  ReportStatus.REVIEWED,
] as const;

type TReportPayload =
  | TUserReportPayload
  | TPostReportPayload
  | TCommentReportPayload
  | TCommunityReportPayload;

type TResolvedReport = {
  targetType: ReportTargetType;
  payload: TReportPayload;
  response: TReportResponse;
};

const mapUser = (user: TReportUserSummary): TReportUserSummary => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  deletedAt: user.deletedAt,
});

const excerpt = (value: string) => value.slice(0, REPORT_EXCERPT_LENGTH);

const mapCommon = (
  row: TReportPayload,
  targetType: ReportTargetType,
  targetId: string,
) => ({
  id: row.id,
  targetType,
  targetId,
  reason: row.reason,
  details: row.details,
  status: row.status,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  reporter: mapUser(row.reporter),
  reviewedBy: row.reviewedBy ? mapUser(row.reviewedBy) : null,
  reviewedAt: row.reviewedAt,
});

const mapUserReport = (row: TUserReportPayload): TReportResponse => ({
  ...mapCommon(row, ReportTargetType.USER, row.reportedUserId),
  target: { type: "USER", ...mapUser(row.reportedUser) },
});

const mapPostReport = (row: TPostReportPayload): TReportResponse => ({
  ...mapCommon(row, ReportTargetType.POST, row.postId),
  target: {
    type: "POST",
    id: row.post.id,
    author: mapUser(row.post.author),
    communityId: row.post.communityId,
    excerpt: excerpt(row.post.content),
    visibility: row.post.visibility,
    isDeleted: row.post.isDeleted,
  },
});

const mapCommentReport = (row: TCommentReportPayload): TReportResponse => ({
  ...mapCommon(row, ReportTargetType.COMMENT, row.commentId),
  target: {
    type: "COMMENT",
    id: row.comment.id,
    author: mapUser(row.comment.author),
    postId: row.comment.postId,
    excerpt: excerpt(row.comment.content),
    isDeleted: row.comment.isDeleted,
  },
});

const mapCommunityReport = (row: TCommunityReportPayload): TReportResponse => ({
  ...mapCommon(row, ReportTargetType.COMMUNITY, row.communityId),
  target: {
    type: "COMMUNITY",
    id: row.community.id,
    owner: mapUser(row.community.owner),
    name: row.community.name,
    slug: row.community.slug,
    excerpt: row.community.description
      ? excerpt(row.community.description)
      : null,
    visibility: row.community.visibility,
    isSuspended: row.community.isSuspended,
    deletedAt: row.community.deletedAt,
  },
});

const toSummary = (response: TReportResponse): TReportSummary => ({
  id: response.id,
  targetType: response.targetType,
  targetId: response.targetId,
  reason: response.reason,
  details: response.details,
  status: response.status,
  createdAt: response.createdAt,
  updatedAt: response.updatedAt,
});

const isPrismaCode = (error: unknown, code: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

const normalizeDetails = (payload: TCreateReportPayload) => {
  const details = payload.details?.trim() || null;
  if (details && details.length > REPORT_MAX_DETAILS_LENGTH) {
    throw new AppError(
      status.BAD_REQUEST,
      `Details cannot exceed ${REPORT_MAX_DETAILS_LENGTH} characters`,
    );
  }
  if (payload.reason === ReportReason.OTHER && !details) {
    throw new AppError(
      status.BAD_REQUEST,
      "Details are required for OTHER reports",
    );
  }
  return details;
};

const assertNotOwned = (isOwned: boolean) => {
  if (isOwned) {
    throw new AppError(
      status.BAD_REQUEST,
      "You cannot report your own content",
    );
  }
};

const createUserReport = async (
  tx: Prisma.TransactionClient,
  requesterId: string,
  payload: TCreateReportPayload,
  details: string | null,
) => {
  const target = await tx.user.findFirst({
    where: { id: payload.target.id, ...ACTIVE_PUBLIC_USER_WHERE },
    select: { id: true },
  });
  if (!target) throw new AppError(status.NOT_FOUND, "Report target not found");
  assertNotOwned(target.id === requesterId);
  const existing = await tx.userReport.findFirst({
    where: {
      reporterId: requesterId,
      reportedUserId: target.id,
      status: { in: [...ACTIVE_REPORT_STATUSES] },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: USER_REPORT_SELECT,
  });
  if (existing) return { created: false, response: mapUserReport(existing) };
  try {
    const created = await tx.userReport.create({
      data: {
        reporterId: requesterId,
        reportedUserId: target.id,
        reason: payload.reason,
        details,
      },
      select: USER_REPORT_SELECT,
    });
    return { created: true, response: mapUserReport(created) };
  } catch (error) {
    return rethrowReportCreateError(error, "reportedUserId");
  }
};

const createPostReport = async (
  tx: Prisma.TransactionClient,
  requester: Express.AuthenticatedUser,
  payload: TCreateReportPayload,
  details: string | null,
) => {
  const target = await tx.post.findFirst({
    where: {
      id: payload.target.id,
      ...PostVisibilityService.buildVisiblePostWhere(requester),
    },
    select: { id: true, authorId: true },
  });
  if (!target) throw new AppError(status.NOT_FOUND, "Report target not found");
  assertNotOwned(target.authorId === requester.id);
  const existing = await tx.postReport.findFirst({
    where: {
      reporterId: requester.id,
      postId: target.id,
      status: { in: [...ACTIVE_REPORT_STATUSES] },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: POST_REPORT_SELECT,
  });
  if (existing) return { created: false, response: mapPostReport(existing) };
  try {
    const created = await tx.postReport.create({
      data: {
        reporterId: requester.id,
        postId: target.id,
        reason: payload.reason,
        details,
      },
      select: POST_REPORT_SELECT,
    });
    return { created: true, response: mapPostReport(created) };
  } catch (error) {
    return rethrowReportCreateError(error, "postId");
  }
};

const createCommentReport = async (
  tx: Prisma.TransactionClient,
  requester: Express.AuthenticatedUser,
  payload: TCreateReportPayload,
  details: string | null,
) => {
  const target = await tx.comment.findFirst({
    where: {
      id: payload.target.id,
      ...DISPLAYABLE_POST_COMMENT_WHERE,
      post: { is: PostVisibilityService.buildVisiblePostWhere(requester) },
    },
    select: { id: true, authorId: true },
  });
  if (!target) throw new AppError(status.NOT_FOUND, "Report target not found");
  assertNotOwned(target.authorId === requester.id);
  const existing = await tx.commentReport.findFirst({
    where: {
      reporterId: requester.id,
      commentId: target.id,
      status: { in: [...ACTIVE_REPORT_STATUSES] },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: COMMENT_REPORT_SELECT,
  });
  if (existing) return { created: false, response: mapCommentReport(existing) };
  try {
    const created = await tx.commentReport.create({
      data: {
        reporterId: requester.id,
        commentId: target.id,
        reason: payload.reason,
        details,
      },
      select: COMMENT_REPORT_SELECT,
    });
    return { created: true, response: mapCommentReport(created) };
  } catch (error) {
    return rethrowReportCreateError(error, "commentId");
  }
};

const createCommunityReport = async (
  tx: Prisma.TransactionClient,
  requester: Express.AuthenticatedUser,
  payload: TCreateReportPayload,
  details: string | null,
) => {
  const target = await tx.community.findFirst({
    where: {
      id: payload.target.id,
      ...buildReadableCommunityWhere(requester),
    },
    select: { id: true, ownerId: true },
  });
  if (!target) throw new AppError(status.NOT_FOUND, "Report target not found");
  assertNotOwned(target.ownerId === requester.id);
  const existing = await tx.communityReport.findFirst({
    where: {
      reporterId: requester.id,
      communityId: target.id,
      status: { in: [...ACTIVE_REPORT_STATUSES] },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: COMMUNITY_REPORT_SELECT,
  });
  if (existing) {
    return { created: false, response: mapCommunityReport(existing) };
  }
  try {
    const created = await tx.communityReport.create({
      data: {
        reporterId: requester.id,
        communityId: target.id,
        reason: payload.reason,
        details,
      },
      select: COMMUNITY_REPORT_SELECT,
    });
    return { created: true, response: mapCommunityReport(created) };
  } catch (error) {
    return rethrowReportCreateError(error, "communityId");
  }
};

const createInTransaction = (
  tx: Prisma.TransactionClient,
  requester: Express.AuthenticatedUser,
  payload: TCreateReportPayload,
  details: string | null,
) => {
  if (payload.target.type === ReportTargetType.USER) {
    return createUserReport(tx, requester.id, payload, details);
  }
  if (payload.target.type === ReportTargetType.POST) {
    return createPostReport(tx, requester, payload, details);
  }
  if (payload.target.type === ReportTargetType.COMMENT) {
    return createCommentReport(tx, requester, payload, details);
  }
  return createCommunityReport(tx, requester, payload, details);
};

const createReport = async (
  requester: Express.AuthenticatedUser,
  payload: TCreateReportPayload,
) => {
  const details = normalizeDetails(payload);
  for (
    let attempt = 1;
    attempt <= REPORT_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const result = await prisma.$transaction(
        (tx) => createInTransaction(tx, requester, payload, details),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return {
        statusCode: result.created ? status.CREATED : status.OK,
        message: result.created
          ? "Report submitted successfully"
          : "Report already submitted",
        data: toSummary(result.response),
      };
    } catch (error) {
      if (
        isPrismaCode(error, "P2034") &&
        attempt < REPORT_TRANSACTION_MAX_ATTEMPTS
      ) {
        continue;
      }
      if (isPrismaCode(error, "P2034")) {
        throw new AppError(
          status.CONFLICT,
          "Report submission conflicted. Please retry",
        );
      }
      throw error;
    }
  }
  throw new AppError(
    status.CONFLICT,
    "Report submission conflicted. Please retry",
  );
};

const resolveReportById = async (id: string): Promise<TResolvedReport> => {
  const [user, post, comment, community] = await Promise.all([
    prisma.userReport.findUnique({ where: { id }, select: USER_REPORT_SELECT }),
    prisma.postReport.findUnique({ where: { id }, select: POST_REPORT_SELECT }),
    prisma.commentReport.findUnique({
      where: { id },
      select: COMMENT_REPORT_SELECT,
    }),
    prisma.communityReport.findUnique({
      where: { id },
      select: COMMUNITY_REPORT_SELECT,
    }),
  ]);
  const matches: TResolvedReport[] = [];
  if (user)
    matches.push({
      targetType: ReportTargetType.USER,
      payload: user,
      response: mapUserReport(user),
    });
  if (post)
    matches.push({
      targetType: ReportTargetType.POST,
      payload: post,
      response: mapPostReport(post),
    });
  if (comment)
    matches.push({
      targetType: ReportTargetType.COMMENT,
      payload: comment,
      response: mapCommentReport(comment),
    });
  if (community)
    matches.push({
      targetType: ReportTargetType.COMMUNITY,
      payload: community,
      response: mapCommunityReport(community),
    });
  if (!matches.length) throw new AppError(status.NOT_FOUND, "Report not found");
  if (matches.length > 1)
    throw new AppError(status.CONFLICT, "Report identity conflict");
  return matches[0]!;
};

const validateLimit = (value?: number) => {
  const limit = value ?? REPORT_DEFAULT_LIMIT;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > REPORT_MAX_LIMIT) {
    throw new AppError(
      status.BAD_REQUEST,
      `Limit must be between 1 and ${REPORT_MAX_LIMIT}`,
    );
  }
  return limit;
};

const getReports = async (
  requester: Express.AuthenticatedUser,
  query: TReportListQuery,
) => {
  assertCanReviewReports(requester);
  const limit = validateLimit(query.limit);
  const cursor = decodeReportCursor(query.cursor);
  const types = query.targetType
    ? [query.targetType]
    : Object.values(ReportTargetType);
  const commonWhere = {
    ...(query.status && { status: query.status }),
    ...(query.reason && { reason: query.reason }),
  };
  const groups: TUnifiedReportRow<TReportResponse>[][] = [];

  if (types.includes(ReportTargetType.USER)) {
    const rows = await prisma.userReport.findMany({
      where: {
        ...commonWhere,
        ...buildReportCursorBoundary(ReportTargetType.USER, cursor),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: USER_REPORT_SELECT,
    });
    groups.push(
      rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        targetType: ReportTargetType.USER,
        data: mapUserReport(row),
      })),
    );
  }
  if (types.includes(ReportTargetType.POST)) {
    const rows = await prisma.postReport.findMany({
      where: {
        ...commonWhere,
        ...buildReportCursorBoundary(ReportTargetType.POST, cursor),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: POST_REPORT_SELECT,
    });
    groups.push(
      rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        targetType: ReportTargetType.POST,
        data: mapPostReport(row),
      })),
    );
  }
  if (types.includes(ReportTargetType.COMMENT)) {
    const rows = await prisma.commentReport.findMany({
      where: {
        ...commonWhere,
        ...buildReportCursorBoundary(ReportTargetType.COMMENT, cursor),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: COMMENT_REPORT_SELECT,
    });
    groups.push(
      rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        targetType: ReportTargetType.COMMENT,
        data: mapCommentReport(row),
      })),
    );
  }
  if (types.includes(ReportTargetType.COMMUNITY)) {
    const rows = await prisma.communityReport.findMany({
      where: {
        ...commonWhere,
        ...buildReportCursorBoundary(ReportTargetType.COMMUNITY, cursor),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: COMMUNITY_REPORT_SELECT,
    });
    groups.push(
      rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        targetType: ReportTargetType.COMMUNITY,
        data: mapCommunityReport(row),
      })),
    );
  }

  const merged = mergeReportRows(groups, limit);
  const last = merged.rows.at(-1);
  return {
    data: merged.rows.map((row) => row.data),
    meta: {
      nextCursor: last
        ? encodeReportCursor({
            createdAt: last.createdAt.toISOString(),
            id: last.id,
            targetType: last.targetType,
          })
        : null,
      hasNextPage: merged.hasNextPage,
      limit,
    },
  };
};

const getReportById = async (
  requester: Express.AuthenticatedUser,
  id: string,
) => {
  assertCanReviewReports(requester);
  return (await resolveReportById(id)).response;
};

const getSingleTransition = (
  rows: TReportTransition[],
): TReportTransition | null => {
  if (!rows.length) return null;
  if (rows.length !== 1) {
    throw new Error("Report status CAS returned multiple rows");
  }
  return rows[0]!;
};

const REPORT_TRANSITION_SELECT = {
  id: true,
  status: true,
  reviewedById: true,
  reviewedAt: true,
  updatedAt: true,
} as const;

const mapReviewer = (
  reviewer: Express.AuthenticatedUser,
): TReportUserSummary => ({
  id: reviewer.id,
  name: reviewer.name,
  email: reviewer.email,
  role: reviewer.role,
  status: reviewer.status,
  deletedAt: null,
});

const updateReportStatus = async (
  reviewer: Express.AuthenticatedUser,
  id: string,
  requestedStatus: ReportStatus,
) => {
  assertCanReviewReports(reviewer);
  const statusService = createReportStatusService<TReportResponse>({
    read: async () => (await resolveReportById(id)).response,
    compareAndSwap: async (current, requested) => {
      const data = {
        status: requested,
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
      };
      if (current.targetType === ReportTargetType.USER) {
        return getSingleTransition(
          await prisma.userReport.updateManyAndReturn({
            where: { id: current.id, status: current.status },
            data,
            select: REPORT_TRANSITION_SELECT,
          }),
        );
      }
      if (current.targetType === ReportTargetType.POST) {
        return getSingleTransition(
          await prisma.postReport.updateManyAndReturn({
            where: { id: current.id, status: current.status },
            data,
            select: REPORT_TRANSITION_SELECT,
          }),
        );
      }
      if (current.targetType === ReportTargetType.COMMENT) {
        return getSingleTransition(
          await prisma.commentReport.updateManyAndReturn({
            where: { id: current.id, status: current.status },
            data,
            select: REPORT_TRANSITION_SELECT,
          }),
        );
      }
      return getSingleTransition(
        await prisma.communityReport.updateManyAndReturn({
          where: { id: current.id, status: current.status },
          data,
          select: REPORT_TRANSITION_SELECT,
        }),
      );
    },
    maxAttempts: REPORT_TRANSACTION_MAX_ATTEMPTS,
  });
  const result = await statusService.updateStatus(requestedStatus);
  if (result.kind === "converged") return result.row;

  return {
    ...result.previous,
    status: result.transition.status,
    reviewedBy: mapReviewer(reviewer),
    reviewedAt: result.transition.reviewedAt,
    updatedAt: result.transition.updatedAt,
  };
};

export const ReportService = {
  createReport,
  getReports,
  getReportById,
  updateReportStatus,
};
