import status from "http-status";
import { CLOUDINARY_FOLDER } from "../shared/constants/upload.constant";
import AppError from "../shared/errors/AppError";
import { resolveTrustProxyHops } from "./env.utils";

type NodeEnv = "development" | "production" | "test";

type EnvVars = {
  NODE_ENV: NodeEnv;
  IS_DEV: boolean;
  IS_PROD: boolean;
  IS_TEST: boolean;
  PORT: number;
  TRUST_PROXY_HOPS: number;
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_BASE_PATH: "/api/auth";
  FRONTEND_URL: string;
  MAIL?: {
    SMTP_USER: string;
    SMTP_PASS: string;
    SMTP_HOST: string;
    SMTP_PORT: number;
    SMTP_FROM: string;
  };
  OAUTH?: {
    GOOGLE?: {
      CLIENT_ID: string;
      CLIENT_SECRET: string;
    };
  };
  CLOUDINARY: {
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
    POST_MEDIA_FOLDER: string;
    PROFILE_AVATAR_FOLDER: string;
    PROFILE_COVER_FOLDER: string;
  };
  AI: {
    GEMINI_API_KEY: string;
    GEMINI_MODEL: string;
  };
};

export const getOptionalEnv = (key: string): string | undefined => {
  const value = process.env[key]?.trim();

  return value ? value : undefined;
};

export const getRequiredEnv = (key: string): string => {
  const value = getOptionalEnv(key);

  if (!value) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      `Environment variable {${key}} is required but not defined in .env file.`,
    );
  }

  return value;
};

export const getNumberEnv = (key: string): number => {
  const value = Number(getRequiredEnv(key));

  if (!Number.isFinite(value)) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      `Environment variable {${key}} must be a valid number.`,
    );
  }

  return value;
};

export const getBooleanEnv = (key: string, defaultValue = false): boolean => {
  const value = getOptionalEnv(key);

  if (!value) {
    return defaultValue;
  }

  if (["true", "1", "yes"].includes(value.toLowerCase())) {
    return true;
  }

  if (["false", "0", "no"].includes(value.toLowerCase())) {
    return false;
  }

  throw new AppError(
    status.INTERNAL_SERVER_ERROR,
    `Environment variable {${key}} must be a boolean value.`,
  );
};

const getNodeEnv = (): NodeEnv => {
  const nodeEnv = getRequiredEnv("NODE_ENV");

  if (!["development", "production", "test"].includes(nodeEnv)) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Environment variable {NODE_ENV} must be development, production, or test.",
    );
  }

  return nodeEnv as NodeEnv;
};

const getOriginEnv = (key: string): string => {
  const value = getRequiredEnv(key);

  try {
    const url = new URL(value);

    if (url.pathname !== "/" || url.search || url.hash) {
      throw new Error("Expected origin-only URL");
    }

    return url.origin;
  } catch {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      `Environment variable {${key}} must be a valid origin only, without a path, query, or hash.`,
    );
  }
};

const hasAnyEnv = (keys: string[]) => keys.some((key) => getOptionalEnv(key));

const assertOptionalGroup = (groupName: string, keys: string[]) => {
  if (!hasAnyEnv(keys)) {
    return false;
  }

  const missingKeys = keys.filter((key) => !getOptionalEnv(key));

  if (missingKeys.length) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      `Environment group {${groupName}} is incomplete. Missing: ${missingKeys.join(", ")}.`,
    );
  }

  return true;
};

const envVariables = (): EnvVars => {
  const NODE_ENV = getNodeEnv();
  const TRUST_PROXY_HOPS = resolveTrustProxyHops(
    NODE_ENV,
    getOptionalEnv("TRUST_PROXY_HOPS"),
  );
  const mailKeys = [
    "MAIL_SMTP_USER",
    "MAIL_SMTP_PASS",
    "MAIL_SMTP_HOST",
    "MAIL_SMTP_PORT",
    "MAIL_SMTP_FROM",
  ];
  const hasMailConfig = assertOptionalGroup("MAIL", mailKeys);
  const hasGoogleConfig = assertOptionalGroup("OAUTH.GOOGLE", [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ]);

  if (NODE_ENV === "production" && !hasMailConfig) {
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      `Environment group {MAIL} is required in production. Missing: ${mailKeys.join(", ")}.`,
    );
  }

  return {
    NODE_ENV,
    IS_DEV: NODE_ENV === "development",
    IS_PROD: NODE_ENV === "production",
    IS_TEST: NODE_ENV === "test",
    PORT: getNumberEnv("PORT"),
    TRUST_PROXY_HOPS,
    DATABASE_URL: getRequiredEnv("DATABASE_URL"),
    BETTER_AUTH_SECRET: getRequiredEnv("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: getOriginEnv("BETTER_AUTH_URL"),
    BETTER_AUTH_BASE_PATH: "/api/auth",
    FRONTEND_URL: getOriginEnv("FRONTEND_URL"),
    MAIL: hasMailConfig
      ? {
          SMTP_USER: getRequiredEnv("MAIL_SMTP_USER"),
          SMTP_PASS: getRequiredEnv("MAIL_SMTP_PASS"),
          SMTP_HOST: getRequiredEnv("MAIL_SMTP_HOST"),
          SMTP_PORT: getNumberEnv("MAIL_SMTP_PORT"),
          SMTP_FROM: getRequiredEnv("MAIL_SMTP_FROM"),
        }
      : undefined,
    OAUTH: hasGoogleConfig
      ? {
          GOOGLE: {
            CLIENT_ID: getRequiredEnv("GOOGLE_CLIENT_ID"),
            CLIENT_SECRET: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
          },
        }
      : undefined,
    CLOUDINARY: {
      CLOUDINARY_CLOUD_NAME: getRequiredEnv("CLOUDINARY_CLOUD_NAME"),
      CLOUDINARY_API_KEY: getRequiredEnv("CLOUDINARY_API_KEY"),
      CLOUDINARY_API_SECRET: getRequiredEnv("CLOUDINARY_API_SECRET"),
      POST_MEDIA_FOLDER:
        getOptionalEnv("POST_MEDIA_FOLDER") ?? CLOUDINARY_FOLDER.POST_MEDIA,
      PROFILE_AVATAR_FOLDER:
        getOptionalEnv("PROFILE_AVATAR_FOLDER") ??
        CLOUDINARY_FOLDER.PROFILE_AVATAR,
      PROFILE_COVER_FOLDER:
        getOptionalEnv("PROFILE_COVER_FOLDER") ??
        CLOUDINARY_FOLDER.PROFILE_COVER,
    },
    AI: {
      GEMINI_API_KEY: getRequiredEnv("GEMINI_API_KEY"),
      GEMINI_MODEL: getRequiredEnv("GEMINI_MODEL"),
    },
  };
};

export const envVars = envVariables();
