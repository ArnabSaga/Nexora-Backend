import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import {
  createRateLimit,
  sweepExpiredRateLimitEntries,
  type TRateLimitEntry,
} from "../../../src/app/middleware/rateLimit";

const createRequest = ({
  ip = "203.0.113.10",
  forwardedFor,
  userId,
}: {
  ip?: string;
  forwardedFor?: string;
  userId?: string;
} = {}) =>
  ({
    ip,
    headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {},
    socket: { remoteAddress: ip },
    user: userId ? { id: userId } : undefined,
  }) as unknown as Request;

const invoke = async (
  middleware: ReturnType<typeof createRateLimit>,
  req: Request,
) => {
  let retryAfter: string | undefined;
  const res = {
    setHeader: (name: string, value: string) => {
      if (name === "Retry-After") retryAfter = value;
    },
  } as unknown as Response;
  const error = await new Promise<unknown>((resolve) => {
    middleware(req, res, ((value?: unknown) => resolve(value)) as NextFunction);
  });

  return { error, retryAfter };
};

test("separately created limiters do not share buckets", async () => {
  const first = createRateLimit({ windowMs: 1000, max: 1, message: "same" });
  const second = createRateLimit({ windowMs: 1000, max: 1, message: "same" });
  const req = createRequest();

  assert.equal((await invoke(first, req)).error, undefined);
  assert.equal((await invoke(second, req)).error, undefined);
  assert.ok((await invoke(first, req)).error);
  assert.ok((await invoke(second, req)).error);
});

test("default limiter identity ignores raw forwarded headers", async () => {
  const limiter = createRateLimit({ windowMs: 1000, max: 1 });

  assert.equal(
    (await invoke(limiter, createRequest({ forwardedFor: "198.51.100.1" })))
      .error,
    undefined,
  );
  assert.ok(
    (await invoke(limiter, createRequest({ forwardedFor: "198.51.100.2" })))
      .error,
  );
});

test("custom authenticated keys isolate users and enforce the exact boundary", async () => {
  const limiter = createRateLimit({
    windowMs: 1000,
    max: 120,
    keyGenerator: (req) => `user:${req.user?.id ?? "missing"}`,
  });
  const firstUser = createRequest({ userId: "user-one" });
  const secondUser = createRequest({ userId: "user-two" });

  for (let index = 0; index < 120; index += 1) {
    assert.equal((await invoke(limiter, firstUser)).error, undefined);
  }

  const blocked = await invoke(limiter, firstUser);

  assert.ok(blocked.error);
  assert.ok(blocked.retryAfter);
  assert.equal((await invoke(limiter, secondUser)).error, undefined);
});

test("empty custom keys fail instead of sharing a bucket", async () => {
  const limiter = createRateLimit({
    windowMs: 1000,
    max: 1,
    keyGenerator: () => "   ",
  });

  assert.ok((await invoke(limiter, createRequest())).error);
});

test("expired store entries are removed without deleting active entries", () => {
  const store = new Map<string, TRateLimitEntry>([
    ["expired", { count: 2, resetAt: 10 }],
    ["active", { count: 1, resetAt: 30 }],
  ]);

  sweepExpiredRateLimitEntries(store, 20);

  assert.equal(store.has("expired"), false);
  assert.equal(store.has("active"), true);
});
