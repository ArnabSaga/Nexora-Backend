import status from "http-status";
import AppError from "../shared/errors/AppError";

export const parseNonNegativeIntegerEnv = (
  key: string,
  value: string | undefined,
  defaultValue?: number,
) => {
  if (value === undefined || value.trim() === "") {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      `Environment variable {${key}} is required but not defined in .env file.`,
    );
  }

  if (!/^\d+$/.test(value)) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      `Environment variable {${key}} must be a non-negative integer.`,
    );
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed)) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      `Environment variable {${key}} must be a safe non-negative integer.`,
    );
  }

  return parsed;
};

export const resolveTrustProxyHops = (
  nodeEnv: "development" | "production" | "test",
  value: string | undefined,
) =>
  parseNonNegativeIntegerEnv(
    "TRUST_PROXY_HOPS",
    value,
    nodeEnv === "production" ? undefined : 0,
  );
