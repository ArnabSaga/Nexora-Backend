import type { Request, RequestHandler } from "express";
import status from "http-status";
import AppError from "../shared/errors/AppError";

type TRateLimitOptions = {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
};

export type TRateLimitEntry = {
  count: number;
  resetAt: number;
};

const MAX_SWEEP_INTERVAL_MS = 60 * 1000;

const getClientKey = (req: Parameters<RequestHandler>[0]) => {
  const resolvedIp = req.ip || req.socket.remoteAddress || "unknown";

  return `ip:${resolvedIp}`;
};

export const sweepExpiredRateLimitEntries = (
  store: Map<string, TRateLimitEntry>,
  now: number,
) => {
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
};

export const createRateLimit = ({
  windowMs,
  max,
  message = "Too many requests. Please try again later.",
  keyGenerator,
}: TRateLimitOptions): RequestHandler => {
  const store = new Map<string, TRateLimitEntry>();
  const sweepIntervalMs = Math.min(windowMs, MAX_SWEEP_INTERVAL_MS);
  let lastSweepAt = Date.now();

  return (req, res, next) => {
    const now = Date.now();

    if (now - lastSweepAt >= sweepIntervalMs) {
      sweepExpiredRateLimitEntries(store, now);
      lastSweepAt = now;
    }

    const key = keyGenerator ? keyGenerator(req) : getClientKey(req);

    if (typeof key !== "string" || !key.trim()) {
      next(
        new AppError(
          status.INTERNAL_SERVER_ERROR,
          "Rate limit key generator returned an invalid key",
        ),
      );
      return;
    }

    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
      store.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      next();
      return;
    }

    existing.count += 1;

    if (existing.count > max) {
      const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      next(new AppError(status.TOO_MANY_REQUESTS, message));
      return;
    }

    next();
  };
};

export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many authentication attempts. Please try again later.",
});

export const sensitiveAuthRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    "Too many sensitive authentication requests. Please try again later.",
});

export const postCreateRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many post requests. Please try again later.",
});

export const commentCreateRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Too many comment requests. Please try again later.",
});

export const reactionMutationRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: "Too many reaction requests. Please try again later.",
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : getClientKey(req),
});

export const voteMutationRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: "Too many vote requests. Please try again later.",
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : getClientKey(req),
});

export const followMutationRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Too many follow requests. Please try again later.",
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : getClientKey(req),
});

export const communityMutationRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Too many community requests. Please try again later.",
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : getClientKey(req),
});

export const bookmarkMutationRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: "Too many bookmark requests. Please try again later.",
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : getClientKey(req),
});
