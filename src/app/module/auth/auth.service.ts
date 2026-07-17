import status from "http-status";
import { UserStatus } from "../../../generated/prisma/client";
import { envVars } from "../../config/env";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import {
  TChangePasswordPayload,
  TForgotPasswordPayload,
  TGoogleLoginPayload,
  TLoginPayload,
  TRegisterPayload,
  TResendVerificationEmailPayload,
  TResetPasswordPayload,
  TVerifyEmailPayload,
} from "./auth.interface";
import {
  getBetterAuthErrorMessage,
  normalizeAuthUser,
  normalizeEmail,
  parseBetterAuthResponse,
  throwBetterAuthError,
} from "./auth.utils";

type TBetterAuthEndpoint<T> = (context: {
  headers?: Headers;
  body?: unknown;
  query?: unknown;
  asResponse: true;
}) => Promise<globalThis.Response>;

type TAuthProviderInvocationResult =
  | { delivered: true }
  | { delivered: false };

type TAuthProviderFailureCategory =
  | "CLIENT_ERROR"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "MALFORMED_PROVIDER_ERROR"
  | "UNKNOWN";

type TAuthProviderOperation = "password-reset" | "verification-email";

type TAuthProviderFailureContext = {
  category: TAuthProviderFailureCategory;
  statusCode?: number;
};

type TPasswordResetProviderInput = {
  headers: Headers;
  email: string;
  redirectTo?: string;
  requestId?: string;
};

type TVerificationEmailProviderInput = {
  headers: Headers;
  email: string;
  callbackURL?: string;
  requestId?: string;
};

const authUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  role: true,
  status: true,
  lastLoginAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  profile: {
    select: {
      id: true,
      username: true,
      avatar: true,
      headline: true,
    },
  },
} as const;

const normalizeUrl = (url: string): string => url.replace(/\/$/, "");

const genericPasswordResetResponse = {
  status: true,
  message: "If the email exists, reset instructions have been sent.",
};

const genericVerificationResponse = {
  status: true,
  message:
    "If the email exists and is unverified, verification instructions have been sent.",
};

const getTrustedCallbackUrl = (url: string | undefined, fallback?: string) => {
  const candidate = url ?? fallback;

  if (!candidate) {
    return undefined;
  }

  const parsedUrl = new URL(candidate);
  const frontendOrigin = new URL(envVars.FRONTEND_URL).origin;

  if (parsedUrl.origin !== frontendOrigin) {
    throw new AppError(
      status.BAD_REQUEST,
      "Callback URL origin is not allowed",
    );
  }

  return parsedUrl.toString();
};

const callBetterAuth = async <T>(
  endpoint: TBetterAuthEndpoint<T>,
  context: Omit<Parameters<TBetterAuthEndpoint<T>>[0], "asResponse">,
) => {
  try {
    const response = await endpoint({
      ...context,
      asResponse: true,
    });

    const data = await parseBetterAuthResponse<T>(response);

    if (!response.ok) {
      throw new AppError(
        response.status,
        getBetterAuthErrorMessage(data, "Authentication request failed"),
      );
    }

    return {
      data,
      response,
    };
  } catch (error) {
    return throwBetterAuthError(error);
  }
};

const getTrustedProviderStatusCode = (statusCode: number) => {
  if (
    Number.isInteger(statusCode) &&
    statusCode >= status.BAD_REQUEST &&
    statusCode < 600
  ) {
    return statusCode;
  }

  return undefined;
};

const classifyProviderResponse = (
  response: globalThis.Response,
): TAuthProviderFailureContext => {
  const statusCode = getTrustedProviderStatusCode(response.status);

  if (!statusCode) {
    return {
      category: "MALFORMED_PROVIDER_ERROR",
    };
  }

  if (statusCode === status.TOO_MANY_REQUESTS) {
    return {
      category: "RATE_LIMITED",
      statusCode,
    };
  }

  if (statusCode >= status.INTERNAL_SERVER_ERROR) {
    return {
      category: "SERVER_ERROR",
      statusCode,
    };
  }

  return {
    category: "CLIENT_ERROR",
    statusCode,
  };
};

const classifyProviderThrownError = (
  error: unknown,
): TAuthProviderFailureContext => {
  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      category: "TIMEOUT",
    };
  }

  if (error instanceof TypeError) {
    return {
      category: "NETWORK_ERROR",
    };
  }

  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return {
        category: "TIMEOUT",
      };
    }

    const code =
      "code" in error && typeof error.code === "string" ? error.code : "";

    if (["ECONNRESET", "ENOTFOUND", "ETIMEDOUT"].includes(code)) {
      return {
        category: code === "ETIMEDOUT" ? "TIMEOUT" : "NETWORK_ERROR",
      };
    }
  }

  return {
    category: "UNKNOWN",
  };
};

const safeLogAuthProviderFailure = (options: {
  operation: TAuthProviderOperation;
  provider: "better-auth";
  category: TAuthProviderFailureCategory;
  statusCode?: number;
  requestId?: string;
}) => {
  try {
    console.warn("[Auth provider delivery failed]", {
      operation: options.operation,
      provider: options.provider,
      category: options.category,
      ...(options.statusCode && { statusCode: options.statusCode }),
      ...(options.requestId && { requestId: options.requestId }),
    });
  } catch {
    // Logging must never affect account-recovery responses.
  }
};

const invokePasswordResetProvider = async (
  input: TPasswordResetProviderInput,
): Promise<TAuthProviderInvocationResult> => {
  try {
    const response = (await (
      auth.api.requestPasswordReset as unknown as TBetterAuthEndpoint<{
        status: boolean;
        message: string;
      }>
    )({
      headers: input.headers,
      body: {
        email: input.email,
        redirectTo: input.redirectTo,
      },
      asResponse: true,
    })) as unknown;

    if (!(response instanceof globalThis.Response)) {
      safeLogAuthProviderFailure({
        operation: "password-reset",
        provider: "better-auth",
        category: "MALFORMED_PROVIDER_ERROR",
        requestId: input.requestId,
      });

      return { delivered: false };
    }

    if (response.ok) {
      return { delivered: true };
    }

    const context = classifyProviderResponse(response);

    safeLogAuthProviderFailure({
      operation: "password-reset",
      provider: "better-auth",
      category: context.category,
      statusCode: context.statusCode,
      requestId: input.requestId,
    });

    return { delivered: false };
  } catch (error) {
    const context = classifyProviderThrownError(error);

    safeLogAuthProviderFailure({
      operation: "password-reset",
      provider: "better-auth",
      category: context.category,
      statusCode: context.statusCode,
      requestId: input.requestId,
    });

    return { delivered: false };
  }
};

const invokeVerificationEmailProvider = async (
  input: TVerificationEmailProviderInput,
): Promise<TAuthProviderInvocationResult> => {
  try {
    const response = (await (
      auth.api.sendVerificationEmail as unknown as TBetterAuthEndpoint<{
        status: boolean;
      }>
    )({
      headers: input.headers,
      body: {
        email: input.email,
        callbackURL: input.callbackURL,
      },
      asResponse: true,
    })) as unknown;

    if (!(response instanceof globalThis.Response)) {
      safeLogAuthProviderFailure({
        operation: "verification-email",
        provider: "better-auth",
        category: "MALFORMED_PROVIDER_ERROR",
        requestId: input.requestId,
      });

      return { delivered: false };
    }

    if (response.ok) {
      return { delivered: true };
    }

    const context = classifyProviderResponse(response);

    safeLogAuthProviderFailure({
      operation: "verification-email",
      provider: "better-auth",
      category: context.category,
      statusCode: context.statusCode,
      requestId: input.requestId,
    });

    return { delivered: false };
  } catch (error) {
    const context = classifyProviderThrownError(error);

    safeLogAuthProviderFailure({
      operation: "verification-email",
      provider: "better-auth",
      category: context.category,
      statusCode: context.statusCode,
      requestId: input.requestId,
    });

    return { delivered: false };
  }
};

const getRecoveryUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      emailVerified: true,
      status: true,
      deletedAt: true,
    },
  });
};

const isActiveRecoveryUser = (
  user: Awaited<ReturnType<typeof getRecoveryUserByEmail>>,
) => {
  return Boolean(
    user &&
      user.status === UserStatus.ACTIVE &&
      user.deletedAt === null,
  );
};

const getUserByEmailOrThrow = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email: normalizeEmail(email),
    },
    select: authUserSelect,
  });

  if (!user || user.status === UserStatus.DELETED || user.deletedAt) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  return user;
};

const ensureUserCanRegister = async (email: string) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizeEmail(email),
    },
    select: {
      id: true,
      status: true,
      deletedAt: true,
    },
  });

  if (!existingUser) {
    return;
  }

  if (existingUser.status === UserStatus.DELETED || existingUser.deletedAt) {
    throw new AppError(
      status.CONFLICT,
      "This email belongs to a deleted account. Please contact support",
    );
  }

  throw new AppError(status.CONFLICT, "A user already exists with this email");
};

const ensureUserCanLogin = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email: normalizeEmail(email),
    },
    select: {
      id: true,
      status: true,
      deletedAt: true,
    },
  });

  if (!user) {
    throw new AppError(status.UNAUTHORIZED, "Invalid email or password");
  }

  if (user.status === UserStatus.DELETED || user.deletedAt) {
    throw new AppError(status.FORBIDDEN, "This account has been deleted");
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError(status.FORBIDDEN, "This account is not active");
  }

  return user;
};

const register = async (payload: TRegisterPayload, headers: Headers) => {
  const email = normalizeEmail(payload.email);

  await ensureUserCanRegister(email);

  const result = await callBetterAuth<{
    token: string | null;
    user: Record<string, unknown>;
  }>(
    auth.api.signUpEmail as unknown as TBetterAuthEndpoint<{
      token: string | null;
      user: Record<string, unknown>;
    }>,
    {
      headers,
      body: {
        ...payload,
        name: payload.name.trim(),
        email,
      },
    },
  );

  const user = await getUserByEmailOrThrow(email);

  return {
    ...result,
    data: {
      token: result.data.token,
      user: normalizeAuthUser(user),
    },
  };
};

const login = async (payload: TLoginPayload, headers: Headers) => {
  const email = normalizeEmail(payload.email);

  await ensureUserCanLogin(email);

  const result = await callBetterAuth<{
    redirect: boolean;
    token: string;
    url?: string;
    user: Record<string, unknown>;
  }>(
    auth.api.signInEmail as unknown as TBetterAuthEndpoint<{
      redirect: boolean;
      token: string;
      url?: string;
      user: Record<string, unknown>;
    }>,
    {
      headers,
      body: {
        ...payload,
        email,
      },
    },
  );

  const user = await getUserByEmailOrThrow(email);

  return {
    ...result,
    data: {
      token: result.data.token,
      user: normalizeAuthUser(user),
    },
  };
};

const logout = async (headers: Headers) => {
  return callBetterAuth<{ success: boolean }>(
    auth.api.signOut as unknown as TBetterAuthEndpoint<{
      success: boolean;
    }>,
    {
      headers,
    },
  );
};

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: authUserSelect,
  });

  if (!user || user.status === UserStatus.DELETED || user.deletedAt) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError(status.FORBIDDEN, "This account is not active");
  }

  return normalizeAuthUser(user);
};

const verifyEmail = async (payload: TVerifyEmailPayload, headers: Headers) => {
  return callBetterAuth<{ status: boolean }>(
    auth.api.verifyEmail as unknown as TBetterAuthEndpoint<{
      status: boolean;
    }>,
    {
      headers,
      query: {
        token: payload.token,
        callbackURL: getTrustedCallbackUrl(payload.callbackURL),
      },
    },
  );
};

const forgotPassword = async (
  payload: TForgotPasswordPayload,
  headers: Headers,
) => {
  const redirectTo = getTrustedCallbackUrl(payload.redirectTo);
  const email = normalizeEmail(payload.email);
  const user = await getRecoveryUserByEmail(email);

  if (!isActiveRecoveryUser(user)) {
    return {
      data: genericPasswordResetResponse,
    };
  }

  await invokePasswordResetProvider({
    headers,
    email,
    redirectTo,
  });

  return {
    data: genericPasswordResetResponse,
  };
};

const resetPassword = async (
  payload: TResetPasswordPayload,
  headers: Headers,
) => {
  return callBetterAuth<{ status: boolean }>(
    auth.api.resetPassword as unknown as TBetterAuthEndpoint<{
      status: boolean;
    }>,
    {
      headers,
      body: {
        newPassword: payload.newPassword,
      },
      query: {
        token: payload.token,
      },
    },
  );
};

const changePassword = async (
  payload: TChangePasswordPayload,
  headers: Headers,
) => {
  const currentPassword = payload.currentPassword ?? payload.oldPassword;

  return callBetterAuth<{ success: boolean; message: string }>(
    auth.api.changePassword as unknown as TBetterAuthEndpoint<{
      success: boolean;
      message: string;
    }>,
    {
      headers,
      body: {
        currentPassword,
        newPassword: payload.newPassword,
        revokeOtherSessions: payload.revokeOtherSessions ?? true,
      },
    },
  );
};

const resendVerificationEmail = async (
  payload: TResendVerificationEmailPayload,
  headers: Headers,
) => {
  const callbackURL = getTrustedCallbackUrl(payload.callbackURL);
  const email = normalizeEmail(payload.email);
  const user = await getRecoveryUserByEmail(email);

  if (!isActiveRecoveryUser(user) || user?.emailVerified) {
    return {
      data: genericVerificationResponse,
    };
  }

  await invokeVerificationEmailProvider({
    headers,
    email,
    callbackURL,
  });

  return {
    data: genericVerificationResponse,
  };
};

const googleLogin = async (payload: TGoogleLoginPayload, headers: Headers) => {
  if (!envVars.OAUTH?.GOOGLE) {
    throw new AppError(
      status.SERVICE_UNAVAILABLE,
      "Google login is not configured",
    );
  }

  return callBetterAuth<{
    redirect: boolean;
    token?: string;
    url?: string;
    user?: Record<string, unknown>;
  }>(
    auth.api.signInSocial as unknown as TBetterAuthEndpoint<{
      redirect: boolean;
      token?: string;
      url?: string;
      user?: Record<string, unknown>;
    }>,
    {
      headers,
      body: {
        provider: "google",
        callbackURL: getTrustedCallbackUrl(
          payload.callbackURL,
          `${normalizeUrl(envVars.FRONTEND_URL)}/auth/google-callback`,
        ),
        newUserCallbackURL: getTrustedCallbackUrl(payload.newUserCallbackURL),
        errorCallbackURL: getTrustedCallbackUrl(
          payload.errorCallbackURL,
          `${normalizeUrl(envVars.FRONTEND_URL)}/auth/login`,
        ),
      },
    },
  );
};

const googleLoginSuccess = async (userId: string) => {
  return getMe(userId);
};

export const AuthService = {
  register,
  login,
  logout,
  getMe,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  resendVerificationEmail,
  googleLogin,
  googleLoginSuccess,
};
