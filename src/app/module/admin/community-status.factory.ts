import status from "http-status";
import AppError from "../../shared/errors/AppError";
import type {
  TAdminCommunityStatus,
  TAdminCommunityStatusResponse,
} from "./admin.interface";

export type TCommunityStatusRow = {
  id: string;
  isSuspended: boolean;
  deletedAt: Date | null;
  updatedAt: Date;
};

export type TCommunityStatusTransition = Pick<
  TCommunityStatusRow,
  "id" | "isSuspended" | "updatedAt"
>;

type TCommunityStatusDependencies = {
  read(id: string): Promise<TCommunityStatusRow | null>;
  compareAndSwap(input: {
    id: string;
    expectedIsSuspended: boolean;
    desiredIsSuspended: boolean;
  }): Promise<TCommunityStatusTransition[]>;
};

const mapStatus = (
  row: TCommunityStatusTransition,
): TAdminCommunityStatusResponse => ({
  id: row.id,
  status: row.isSuspended ? "SUSPENDED" : "ACTIVE",
  updatedAt: row.updatedAt,
});

export const createCommunityStatusWriter = (
  dependencies: TCommunityStatusDependencies,
) => ({
  updateStatus: async (
    id: string,
    requested: TAdminCommunityStatus,
  ): Promise<TAdminCommunityStatusResponse> => {
    const desiredIsSuspended = requested === "SUSPENDED";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = await dependencies.read(id);
      if (!current || current.deletedAt) {
        throw new AppError(status.NOT_FOUND, "Community not found");
      }
      if (current.isSuspended === desiredIsSuspended) {
        return mapStatus(current);
      }

      const rows = await dependencies.compareAndSwap({
        id: current.id,
        expectedIsSuspended: current.isSuspended,
        desiredIsSuspended,
      });
      if (rows.length > 1) {
        throw new AppError(
          status.INTERNAL_SERVER_ERROR,
          "Community status update invariant failed",
        );
      }
      if (rows[0]) return mapStatus(rows[0]);
    }

    throw new AppError(
      status.CONFLICT,
      "Community status changed concurrently",
    );
  },
});

export type TCommunityStatusWriter = ReturnType<
  typeof createCommunityStatusWriter
>;
