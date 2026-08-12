import status from "http-status";
import { z } from "zod";
import AppError from "../../shared/errors/AppError";
import { NOTIFICATION_CURSOR_VERSION } from "./notification.constant";
import type { TNotificationCursorPayload } from "./notification.interface";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const payloadSchema = z
  .object({
    version: z.literal(NOTIFICATION_CURSOR_VERSION),
    createdAt: z.string(),
    id: z.cuid(),
  })
  .strict();

export const encodeNotificationCursor = (
  payload: Omit<TNotificationCursorPayload, "version">,
) =>
  Buffer.from(
    JSON.stringify({ version: NOTIFICATION_CURSOR_VERSION, ...payload }),
  ).toString("base64url");

export const decodeNotificationCursor = (
  cursor?: unknown,
): TNotificationCursorPayload | null => {
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
    throw new AppError(status.BAD_REQUEST, "Invalid notification cursor");
  }
};
