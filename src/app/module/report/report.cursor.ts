import status from "http-status";
import { z } from "zod";
import { ReportTargetType } from "../../../generated/prisma/client";
import AppError from "../../shared/errors/AppError";
import { REPORT_CURSOR_VERSION } from "./report.constant";
import type { TReportCursorPayload } from "./report.interface";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const payloadSchema = z
  .object({
    version: z.literal(REPORT_CURSOR_VERSION),
    createdAt: z.string(),
    id: z.cuid(),
    targetType: z.enum(ReportTargetType),
  })
  .strict();

export const encodeReportCursor = (
  payload: Omit<TReportCursorPayload, "version">,
) =>
  Buffer.from(
    JSON.stringify({ version: REPORT_CURSOR_VERSION, ...payload }),
  ).toString("base64url");

export const decodeReportCursor = (
  cursor?: unknown,
): TReportCursorPayload | null => {
  if (cursor === undefined) return null;
  try {
    if (typeof cursor !== "string" || !BASE64URL_PATTERN.test(cursor)) {
      throw new Error();
    }
    const buffer = Buffer.from(cursor, "base64url");
    if (buffer.toString("base64url") !== cursor) throw new Error();
    const payload = payloadSchema.parse(JSON.parse(buffer.toString("utf8")));
    const date = new Date(payload.createdAt);
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString() !== payload.createdAt
    ) {
      throw new Error();
    }
    return payload;
  } catch {
    throw new AppError(status.BAD_REQUEST, "Invalid report cursor");
  }
};
