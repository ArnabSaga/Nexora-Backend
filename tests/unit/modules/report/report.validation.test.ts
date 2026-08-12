import assert from "node:assert/strict";
import test from "node:test";
import {
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from "../../../../src/generated/prisma/client";
import { ReportValidation } from "../../../../src/app/module/report/report.validation";
import {
  decodeReportCursor,
  encodeReportCursor,
} from "../../../../src/app/module/report/report.cursor";
import AppError from "../../../../src/app/shared/errors/AppError";

const id = "cm12345678901234567890123";
const createdAt = "2026-08-12T10:20:30.000Z";

test("Report create validation normalizes details and enforces OTHER", () => {
  assert.deepEqual(
    ReportValidation.create.parse({
      target: { type: ReportTargetType.POST, id },
      reason: ReportReason.SPAM,
      details: "   ",
    }),
    {
      target: { type: ReportTargetType.POST, id },
      reason: ReportReason.SPAM,
      details: null,
    },
  );
  assert.equal(
    ReportValidation.create.parse({
      target: { type: ReportTargetType.USER, id },
      reason: ReportReason.OTHER,
      details: "  context  ",
    }).details,
    "context",
  );
  assert.throws(() =>
    ReportValidation.create.parse({
      target: { type: ReportTargetType.USER, id },
      reason: ReportReason.OTHER,
    }),
  );
});

test("Report validation rejects unknown fields and unsafe list values", () => {
  for (const input of [
    {
      target: { type: ReportTargetType.POST, id, extra: true },
      reason: ReportReason.SPAM,
    },
    { target: { type: "ARTICLE", id }, reason: ReportReason.SPAM },
    {
      target: { type: ReportTargetType.POST, id: ` ${id}` },
      reason: ReportReason.SPAM,
    },
    {
      target: { type: ReportTargetType.POST, id },
      reason: ReportReason.SPAM,
      extra: true,
    },
  ]) {
    assert.throws(() => ReportValidation.create.parse(input));
  }
  for (const query of [
    { limit: "0" },
    { limit: "51" },
    { limit: ["1", "2"] },
    { status: "UNKNOWN" },
    { extra: "true" },
  ]) {
    assert.throws(() => ReportValidation.list.parse(query));
  }
  assert.deepEqual(
    ReportValidation.updateStatus.parse({ status: ReportStatus.REVIEWED }),
    { status: ReportStatus.REVIEWED },
  );
  assert.deepEqual(
    ReportValidation.updateStatus.parse({ status: ReportStatus.PENDING }),
    { status: ReportStatus.PENDING },
  );
});

test("Report cursor is canonical and target-rank aware", () => {
  const cursor = encodeReportCursor({
    createdAt,
    id,
    targetType: ReportTargetType.COMMENT,
  });
  assert.deepEqual(decodeReportCursor(cursor), {
    version: 1,
    createdAt,
    id,
    targetType: ReportTargetType.COMMENT,
  });
  for (const payload of [
    { version: 2, createdAt, id, targetType: ReportTargetType.POST },
    {
      version: 1,
      createdAt: "2026-08-12",
      id,
      targetType: ReportTargetType.POST,
    },
    { version: 1, createdAt, id: "invalid", targetType: ReportTargetType.POST },
    {
      version: 1,
      createdAt,
      id,
      targetType: ReportTargetType.POST,
      extra: true,
    },
  ]) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    assert.throws(
      () => decodeReportCursor(encoded),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
  }
});
