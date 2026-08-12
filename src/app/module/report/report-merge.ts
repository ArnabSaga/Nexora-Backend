import type { ReportTargetType } from "../../../generated/prisma/client";
import { REPORT_TARGET_RANK } from "./report.constant";
import type {
  TReportCursorPayload,
  TUnifiedReportRow,
} from "./report.interface";

export const compareUnifiedReports = (
  left: TUnifiedReportRow,
  right: TUnifiedReportRow,
) => {
  const time = right.createdAt.getTime() - left.createdAt.getTime();
  if (time) return time;
  const id = right.id > left.id ? 1 : right.id < left.id ? -1 : 0;
  if (id) return id;
  return (
    REPORT_TARGET_RANK[left.targetType] - REPORT_TARGET_RANK[right.targetType]
  );
};

export const isReportAfterCursor = (
  row: Pick<TUnifiedReportRow, "createdAt" | "id" | "targetType">,
  cursor: TReportCursorPayload,
) => {
  const cursorTime = new Date(cursor.createdAt).getTime();
  const rowTime = row.createdAt.getTime();
  if (rowTime !== cursorTime) return rowTime < cursorTime;
  if (row.id !== cursor.id) return row.id < cursor.id;
  return (
    REPORT_TARGET_RANK[row.targetType] > REPORT_TARGET_RANK[cursor.targetType]
  );
};

export const buildReportCursorBoundary = (
  targetType: ReportTargetType,
  cursor: TReportCursorPayload | null,
) => {
  if (!cursor) return undefined;
  const createdAt = new Date(cursor.createdAt);
  const branches: Array<Record<string, unknown>> = [
    { createdAt: { lt: createdAt } },
    { createdAt, id: { lt: cursor.id } },
  ];
  if (REPORT_TARGET_RANK[targetType] > REPORT_TARGET_RANK[cursor.targetType]) {
    branches.push({ createdAt, id: cursor.id });
  }
  return { OR: branches };
};

export const mergeReportRows = <TData>(
  groups: TUnifiedReportRow<TData>[][],
  limit: number,
) => {
  const candidates = groups.flat().sort(compareUnifiedReports);
  const hasNextPage = candidates.length > limit;
  return {
    rows: hasNextPage ? candidates.slice(0, limit) : candidates,
    hasNextPage,
  };
};
