import { Request, Response as ExpressResponse } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import AppError from '../../shared/errors/AppError';
import { TAuthUser } from './auth.interface';

type THeadersLike = {
  forEach(callback: (value: string, key: string) => void): void;
  getSetCookie?: () => string[];
};

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const buildAuthHeaders = (req: Request): Headers => fromNodeHeaders(req.headers);

export const normalizeAuthUser = (user: Record<string, unknown>): TAuthUser => {
  return {
    id: String(user.id),
    name: String(user.name),
    email: String(user.email),
    emailVerified: Boolean(user.emailVerified),
    image: (user.image as string | null | undefined) ?? null,
    role: user.role as TAuthUser['role'],
    status: user.status as TAuthUser['status'],
    lastLoginAt: (user.lastLoginAt as Date | null | undefined) ?? null,
    createdAt: new Date(user.createdAt as string | Date),
    updatedAt: new Date(user.updatedAt as string | Date),
    profile: (user.profile as TAuthUser['profile']) ?? null,
  };
};

export const applyBetterAuthCookies = (res: ExpressResponse, headers: THeadersLike) => {
  const setCookies = headers.getSetCookie?.() ?? [];

  if (setCookies.length > 0) {
    res.setHeader('Set-Cookie', setCookies);
    return;
  }

  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      res.setHeader('Set-Cookie', value);
    }
  });
};

export const parseBetterAuthResponse = async <T>(response: globalThis.Response) => {
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    return (await response.json()) as T;
  }

  return undefined as T;
};

export const getBetterAuthErrorMessage = (data: unknown, fallback: string): string => {
  if (typeof data === 'object' && data && 'message' in data) {
    return String((data as { message?: unknown }).message);
  }

  if (typeof data === 'object' && data && 'error' in data) {
    return String((data as { error?: unknown }).error);
  }

  return fallback;
};

export const throwBetterAuthError = (error: unknown): never => {
  if (error instanceof AppError) {
    throw error;
  }

  if (error instanceof Error) {
    throw new AppError(400, error.message);
  }

  throw new AppError(400, 'Authentication request failed');
};
