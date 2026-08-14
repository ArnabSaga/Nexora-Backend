import status from "http-status";
import AppError from "../../shared/errors/AppError";
import { MENTION_MAX_USERS } from "./mention.constant";

const CUID_PATTERN = /^[cC][0-9a-z]{6,}$/;

export const normalizeMentionedUserIds = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.length > MENTION_MAX_USERS) {
    throw new AppError(status.BAD_REQUEST, "Invalid mentioned users");
  }

  if (
    value.some((item) => typeof item !== "string" || !CUID_PATTERN.test(item))
  ) {
    throw new AppError(status.BAD_REQUEST, "Invalid mentioned users");
  }

  return [...new Set(value)];
};
