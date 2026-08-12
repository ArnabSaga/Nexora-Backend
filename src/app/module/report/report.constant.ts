import { ReportTargetType } from "../../../generated/prisma/client";

export const REPORT_DEFAULT_LIMIT = 20;
export const REPORT_MAX_LIMIT = 50;
export const REPORT_CURSOR_VERSION = 1 as const;
export const REPORT_MAX_DETAILS_LENGTH = 1000;
export const REPORT_EXCERPT_LENGTH = 280;
export const REPORT_TRANSACTION_MAX_ATTEMPTS = 3;

export const REPORT_TARGET_RANK = {
  [ReportTargetType.USER]: 0,
  [ReportTargetType.POST]: 1,
  [ReportTargetType.COMMENT]: 2,
  [ReportTargetType.COMMUNITY]: 3,
} as const;
