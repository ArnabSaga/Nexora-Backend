import assert from "node:assert/strict";
import test from "node:test";
import status from "http-status";
import { ReportStatus } from "../../../../src/generated/prisma/client";
import AppError from "../../../../src/app/shared/errors/AppError";
import {
  createReportStatusService,
  type TReportTransition,
} from "../../../../src/app/module/report/report-status.factory";

const timestamp = new Date("2026-08-12T00:00:00.000Z");
const transition = (statusValue: ReportStatus): TReportTransition => ({
  id: "report-id",
  status: statusValue,
  reviewedById: "reviewer-id",
  reviewedAt: timestamp,
  updatedAt: timestamp,
});

test("Report status converges without a CAS", async () => {
  const current = { status: ReportStatus.REVIEWED, audit: "unchanged" };
  let writes = 0;
  const service = createReportStatusService({
    read: async () => current,
    compareAndSwap: async () => {
      writes += 1;
      return transition(ReportStatus.REVIEWED);
    },
  });

  const result = await service.updateStatus(ReportStatus.REVIEWED);
  assert.deepEqual(result, { kind: "converged", row: current });
  assert.equal(writes, 0);
});

test("Report status returns its atomic transition without a post-CAS read", async () => {
  let reads = 0;
  let writes = 0;
  const current = { status: ReportStatus.PENDING, marker: "stable" };
  const won = transition(ReportStatus.REVIEWED);
  const service = createReportStatusService({
    read: async () => {
      reads += 1;
      return current;
    },
    compareAndSwap: async (observed, requested) => {
      writes += 1;
      assert.equal(observed, current);
      assert.equal(requested, ReportStatus.REVIEWED);
      return won;
    },
  });

  assert.deepEqual(await service.updateStatus(ReportStatus.REVIEWED), {
    kind: "transitioned",
    previous: current,
    transition: won,
  });
  assert.equal(reads, 1);
  assert.equal(writes, 1);
});

test("Report status converges after a lost CAS", async () => {
  let reads = 0;
  let writes = 0;
  const service = createReportStatusService({
    read: async () => ({
      status: reads++ === 0 ? ReportStatus.PENDING : ReportStatus.REVIEWED,
    }),
    compareAndSwap: async () => {
      writes += 1;
      return null;
    },
  });

  const result = await service.updateStatus(ReportStatus.REVIEWED);
  assert.equal(result.kind, "converged");
  assert.equal(result.row.status, ReportStatus.REVIEWED);
  assert.equal(reads, 2);
  assert.equal(writes, 1);
});

test("Report status retries a still-legal transition after a lost CAS", async () => {
  let reads = 0;
  let writes = 0;
  const won = transition(ReportStatus.RESOLVED);
  const service = createReportStatusService({
    read: async () => ({
      status: reads++ === 0 ? ReportStatus.PENDING : ReportStatus.REVIEWED,
    }),
    compareAndSwap: async (_current, requested) => {
      writes += 1;
      return writes === 1 ? null : transition(requested);
    },
  });

  const result = await service.updateStatus(ReportStatus.RESOLVED);
  assert.deepEqual(result, {
    kind: "transitioned",
    previous: { status: ReportStatus.REVIEWED },
    transition: won,
  });
  assert.equal(reads, 2);
  assert.equal(writes, 2);
});

test("Report status enforces the complete transition matrix", async (context) => {
  const allowed: Array<[ReportStatus, ReportStatus]> = [
    [ReportStatus.PENDING, ReportStatus.REVIEWED],
    [ReportStatus.PENDING, ReportStatus.RESOLVED],
    [ReportStatus.PENDING, ReportStatus.REJECTED],
    [ReportStatus.REVIEWED, ReportStatus.RESOLVED],
    [ReportStatus.REVIEWED, ReportStatus.REJECTED],
  ];
  const statuses = Object.values(ReportStatus);

  for (const currentStatus of statuses) {
    for (const requested of statuses) {
      await context.test(`${currentStatus} -> ${requested}`, async () => {
        let writes = 0;
        const service = createReportStatusService({
          read: async () => ({ status: currentStatus }),
          compareAndSwap: async () => {
            writes += 1;
            return transition(requested);
          },
        });
        if (currentStatus === requested) {
          const result = await service.updateStatus(requested);
          assert.equal(result.kind, "converged");
          assert.equal(writes, 0);
          return;
        }
        if (
          allowed.some(
            ([from, to]) => from === currentStatus && to === requested,
          )
        ) {
          const result = await service.updateStatus(requested);
          assert.equal(result.kind, "transitioned");
          assert.equal(writes, 1);
          return;
        }
        await assert.rejects(
          service.updateStatus(requested),
          (error: unknown) =>
            error instanceof AppError &&
            error.statusCode === status.CONFLICT &&
            error.message === "Invalid report status transition",
        );
        assert.equal(writes, 0);
      });
    }
  }
});

test("Report status stops after three lost CAS attempts", async () => {
  let reads = 0;
  let writes = 0;
  const service = createReportStatusService({
    read: async () => {
      reads += 1;
      return { status: ReportStatus.PENDING };
    },
    compareAndSwap: async () => {
      writes += 1;
      return null;
    },
  });

  await assert.rejects(
    service.updateStatus(ReportStatus.REVIEWED),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === status.CONFLICT &&
      error.message === "Report status changed concurrently",
  );
  assert.equal(reads, 3);
  assert.equal(writes, 3);
});
