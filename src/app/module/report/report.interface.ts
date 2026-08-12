import type {
  ReportReason,
  ReportStatus,
  ReportTargetType,
  UserRole,
  UserStatus,
  PostVisibility,
  CommunityVisibility,
} from "../../../generated/prisma/client";

export type TCreateReportPayload = {
  target: { type: ReportTargetType; id: string };
  reason: ReportReason;
  details?: string | null;
};

export type TReportListQuery = {
  cursor?: string;
  limit?: number;
  status?: ReportStatus;
  targetType?: ReportTargetType;
  reason?: ReportReason;
};

export type TReportCursorPayload = {
  version: 1;
  createdAt: string;
  id: string;
  targetType: ReportTargetType;
};

export type TUnifiedReportRow<TData = unknown> = {
  id: string;
  targetType: ReportTargetType;
  createdAt: Date;
  data: TData;
};

export type TReportSummary = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type TReportUserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  deletedAt: Date | null;
};

export type TReportTargetSummary =
  | ({ type: "USER" } & TReportUserSummary)
  | {
      type: "POST";
      id: string;
      author: TReportUserSummary;
      communityId: string | null;
      excerpt: string;
      visibility: PostVisibility;
      isDeleted: boolean;
    }
  | {
      type: "COMMENT";
      id: string;
      author: TReportUserSummary;
      postId: string;
      excerpt: string;
      isDeleted: boolean;
    }
  | {
      type: "COMMUNITY";
      id: string;
      owner: TReportUserSummary;
      name: string;
      slug: string;
      excerpt: string | null;
      visibility: CommunityVisibility;
      isSuspended: boolean;
      deletedAt: Date | null;
    };

export type TReportResponse = TReportSummary & {
  reporter: TReportUserSummary;
  reviewedBy: TReportUserSummary | null;
  reviewedAt: Date | null;
  target: TReportTargetSummary;
};

export type TReportActionResult = {
  statusCode: number;
  message: string;
  data: TReportSummary;
};
