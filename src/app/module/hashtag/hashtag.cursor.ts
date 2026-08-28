import status from "http-status";
import { z } from "zod";
import AppError from "../../shared/errors/AppError";
import { HASHTAG_CURSOR_VERSION } from "./hashtag.constant";
import type { THashtagCursorPayload } from "./hashtag.interface";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const payloadSchema = z
  .object({
    version: z.literal(HASHTAG_CURSOR_VERSION),
    createdAt: z.string(),
    id: z.cuid(),
  })
  .strict();

export const encodeHashtagCursor = (
  payload: Omit<THashtagCursorPayload, "version">,
) =>
  Buffer.from(
    JSON.stringify({ version: HASHTAG_CURSOR_VERSION, ...payload }),
  ).toString("base64url");

export const decodeHashtagCursor = (
  cursor?: unknown,
): THashtagCursorPayload | null => {
  if (cursor === undefined) return null;

  try {
    if (typeof cursor !== "string" || !BASE64URL_PATTERN.test(cursor)) {
      throw new Error();
    }

    const buffer = Buffer.from(cursor, "base64url");
    if (buffer.toString("base64url") !== cursor) throw new Error();

    const payload = payloadSchema.parse(JSON.parse(buffer.toString("utf8")));
    const createdAt = new Date(payload.createdAt);
    if (
      !Number.isFinite(createdAt.getTime()) ||
      createdAt.toISOString() !== payload.createdAt
    ) {
      throw new Error();
    }

    return payload;
  } catch {
    throw new AppError(status.BAD_REQUEST, "Invalid hashtag cursor");
  }
};
