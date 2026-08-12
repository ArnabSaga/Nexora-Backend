import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "../../../../src/generated/prisma/client";
import AppError from "../../../../src/app/shared/errors/AppError";
import { rethrowReportCreateError } from "../../../../src/app/module/report/report-prisma-error";

const foreignKeyError = (constraint: string) =>
  new Prisma.PrismaClientKnownRequestError("Foreign key failed", {
    code: "P2003",
    clientVersion: "test",
    meta: { constraint },
  });

test("Report create error maps only the expected target foreign key", () => {
  assert.throws(
    () =>
      rethrowReportCreateError(
        foreignKeyError("post_report_postId_fkey"),
        "postId",
      ),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 404 &&
      error.message === "Report target not found",
  );
});

test("Report create error preserves unrelated foreign key identity", () => {
  const error = foreignKeyError("post_report_reporterId_fkey");
  assert.throws(
    () => rethrowReportCreateError(error, "postId"),
    (thrown: unknown) => thrown === error,
  );
});

test("Report create error preserves non-Prisma error identity", () => {
  const error = new Error("database unavailable");
  assert.throws(
    () => rethrowReportCreateError(error, "communityId"),
    (thrown: unknown) => thrown === error,
  );
});
