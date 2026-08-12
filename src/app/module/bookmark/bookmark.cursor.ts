import status from "http-status";
import { z } from "zod";
import AppError from "../../shared/errors/AppError";
import { BOOKMARK_CURSOR_VERSION } from "./bookmark.constant";
import type { TBookmarkCursorPayload } from "./bookmark.interface";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

const bookmarkCursorPayloadSchema = z
  .object({
    version: z.literal(BOOKMARK_CURSOR_VERSION),
    createdAt: z.string(),
    id: z.cuid(),
  })
  .strict();

export const encodeBookmarkCursor = (
  payload: Omit<TBookmarkCursorPayload, "version">,
) =>
  Buffer.from(
    JSON.stringify({ version: BOOKMARK_CURSOR_VERSION, ...payload }),
  ).toString("base64url");

export const decodeBookmarkCursor = (
  cursor?: unknown,
): TBookmarkCursorPayload | null => {
  if (cursor === undefined) {
    return null;
  }

  try {
    if (typeof cursor !== "string" || !BASE64URL_PATTERN.test(cursor)) {
      throw new Error("Invalid base64url cursor");
    }

    const decodedBuffer = Buffer.from(cursor, "base64url");

    if (decodedBuffer.toString("base64url") !== cursor) {
      throw new Error("Noncanonical base64url cursor");
    }

    const payload = bookmarkCursorPayloadSchema.parse(
      JSON.parse(decodedBuffer.toString("utf8")),
    );
    const date = new Date(payload.createdAt);

    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString() !== payload.createdAt
    ) {
      throw new Error("Invalid cursor timestamp");
    }

    return payload;
  } catch {
    throw new AppError(status.BAD_REQUEST, "Invalid bookmark cursor");
  }
};
