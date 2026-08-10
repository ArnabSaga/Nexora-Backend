import status from "http-status";
import AppError from "../../../shared/errors/AppError";
import { POST_CURSOR_VERSION } from "../constants/post.constant";
import { TPostCursorPayload } from "../post.interface";

const CUID_PATTERN = /^c[a-z0-9]+$/i;

export const encodePostCursor = (payload: Omit<TPostCursorPayload, "version">) =>
  Buffer.from(
    JSON.stringify({
      version: POST_CURSOR_VERSION,
      ...payload,
    }),
  ).toString("base64url");

export const decodePostCursor = (cursor?: string): TPostCursorPayload | null => {
  if (!cursor) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as Partial<TPostCursorPayload>;

    const parsedDate =
      typeof decoded.createdAt === "string"
        ? new Date(decoded.createdAt)
        : null;
    const timestamp = parsedDate?.getTime();

    if (
      decoded.version !== POST_CURSOR_VERSION ||
      typeof decoded.createdAt !== "string" ||
      typeof timestamp !== "number" ||
      !Number.isFinite(timestamp) ||
      typeof decoded.id !== "string" ||
      !CUID_PATTERN.test(decoded.id)
    ) {
      throw new Error("Invalid cursor");
    }

    return {
      version: POST_CURSOR_VERSION,
      createdAt: decoded.createdAt,
      id: decoded.id,
    };
  } catch {
    throw new AppError(status.BAD_REQUEST, "Invalid cursor");
  }
};
