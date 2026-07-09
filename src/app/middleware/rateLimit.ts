import { RequestHandler } from "express";
import status from "http-status";
import AppError from "../shared/errors/AppError";

type TRateLimitOptions = {
  windowMs: number;
  max: number;
  message?: string;
};

type TRateLimitEntry = {
  count: number;
  resetAt: number;
};

const stores = new Map<string, Map<string, TRateLimitEntry>>();

const getClientKey = (req: Parameters<RequestHandler>[0]) => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket.remoteAddress || "unknown";
};

export const createRateLimit = ({
  windowMs,
  max,
  message = "Too many requests. Please try again later.",
}: TRateLimitOptions): RequestHandler => {
  const storeKey = `${windowMs}:${max}:${message}`;

  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map<string, TRateLimitEntry>());
  }

  const store = stores.get(storeKey)!;

  return (req, res, next) => {
    const now = Date.now();
    const key = getClientKey(req);
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
