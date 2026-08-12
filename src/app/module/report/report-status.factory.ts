import status from "http-status";
import { ReportStatus } from "../../../generated/prisma/client";
import AppError from "../../shared/errors/AppError";

type TStatusRow = { status: ReportStatus };

export type TReportTransition = {
  id: string;
  status: ReportStatus;
  reviewedById: string | null;
  reviewedAt: Date | null;
  updatedAt: Date;
};

export type TReportStatusUpdateResult<TRow> =
  | { kind: "converged"; row: TRow }
  | {
      kind: "transitioned";
      previous: TRow;
      transition: TReportTransition;
    };

type TDependencies<TRow extends TStatusRow> = {
  read: () => Promise<TRow>;
  compareAndSwap: (
    current: TRow,
    requested: ReportStatus,
  ) => Promise<TReportTransition | null>;
  maxAttempts?: number;
};

const allowed = (current: ReportStatus, requested: ReportStatus) =>
  current === ReportStatus.PENDING
    ? (
        [
          ReportStatus.REVIEWED,
          ReportStatus.RESOLVED,
          ReportStatus.REJECTED,
        ] as ReportStatus[]
      ).includes(requested)
    : current === ReportStatus.REVIEWED
      ? (
          [ReportStatus.RESOLVED, ReportStatus.REJECTED] as ReportStatus[]
        ).includes(requested)
      : false;

export const createReportStatusService = <TRow extends TStatusRow>({
  read,
  compareAndSwap,
  maxAttempts = 3,
}: TDependencies<TRow>) => {
  const updateStatus = async (
    requested: ReportStatus,
  ): Promise<TReportStatusUpdateResult<TRow>> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const current = await read();
      if (current.status === requested) {
        return { kind: "converged", row: current };
      }
      if (!allowed(current.status, requested)) {
        throw new AppError(status.CONFLICT, "Invalid report status transition");
      }
      const transition = await compareAndSwap(current, requested);
      if (transition) {
        return { kind: "transitioned", previous: current, transition };
      }
    }
    throw new AppError(status.CONFLICT, "Report status changed concurrently");
  };
  return { updateStatus };
};
