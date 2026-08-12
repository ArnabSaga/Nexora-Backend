import assert from "node:assert/strict";
import test from "node:test";
import { ReportTargetType } from "../../../../src/generated/prisma/client";
import {
  buildReportCursorBoundary,
  isReportAfterCursor,
  mergeReportRows,
} from "../../../../src/app/module/report/report-merge";

const time = new Date("2026-08-12T10:20:30.000Z");
const id = "cm12345678901234567890123";
const row = (targetType: ReportTargetType, rowId = id) => ({
  id: rowId,
  targetType,
  createdAt: time,
  data: targetType,
});

test("Report merge applies id DESC then fixed target rank", () => {
  const result = mergeReportRows(
    [
      [row(ReportTargetType.COMMUNITY)],
      [row(ReportTargetType.POST)],
      [row(ReportTargetType.USER)],
      [row(ReportTargetType.COMMENT)],
    ],
    4,
  );
  assert.deepEqual(
    result.rows.map((item) => item.targetType),
    [
      ReportTargetType.USER,
      ReportTargetType.POST,
      ReportTargetType.COMMENT,
      ReportTargetType.COMMUNITY,
    ],
  );
  assert.equal(result.hasNextPage, false);
});

test("Report rank-aware cursor includes only later colliding tables", () => {
  const cursor = {
    version: 1 as const,
    createdAt: time.toISOString(),
    id,
    targetType: ReportTargetType.POST,
  };
  assert.equal(isReportAfterCursor(row(ReportTargetType.USER), cursor), false);
  assert.equal(isReportAfterCursor(row(ReportTargetType.POST), cursor), false);
  assert.equal(
    isReportAfterCursor(row(ReportTargetType.COMMENT), cursor),
    true,
  );
  assert.equal(
    isReportAfterCursor(row(ReportTargetType.COMMUNITY), cursor),
    true,
  );
  assert.equal(
    (buildReportCursorBoundary(ReportTargetType.USER, cursor)?.OR as unknown[])
      .length,
    2,
  );
  assert.equal(
    (
      buildReportCursorBoundary(ReportTargetType.COMMUNITY, cursor)
        ?.OR as unknown[]
    ).length,
    3,
  );
});

test("Report merge keeps a global lookahead", () => {
  const result = mergeReportRows(
    [
      [row(ReportTargetType.USER, "cm99999999999999999999999")],
      [row(ReportTargetType.POST, "cm88888888888888888888888")],
    ],
    1,
  );
  assert.equal(result.rows.length, 1);
  assert.equal(result.hasNextPage, true);
});
