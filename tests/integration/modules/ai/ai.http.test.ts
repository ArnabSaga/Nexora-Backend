import assert from "node:assert/strict";
import express, { type Application } from "express";
import { after, before, test } from "node:test";
import { UserStatus } from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import globalErrorHandler from "../../../../src/app/middleware/globalErrorHandler";
import notFound from "../../../../src/app/middleware/notFound";
import { createAiRateLimit } from "../../../../src/app/middleware/rateLimit";
import { createAiController } from "../../../../src/app/module/ai/ai.controller.factory";
import { createAiService } from "../../../../src/app/module/ai/ai.factory";
import { createAiRoutes } from "../../../../src/app/module/ai/ai.route.factory";
import type { TAiProvider } from "../../../../src/app/module/ai/ai.interface";
import AppError from "../../../../src/app/shared/errors/AppError";
import { installAuthSessionStub } from "../../../support/auth/auth-session.stub";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestUser } from "../../../support/fixtures/user.fixture";
import { startTestServer } from "../../../support/server/test-server";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId) throw new Error("TEST_RUN_ID is required; use the integration runner");

const cleanup = createTestCleanup();
const runId = `${testRunId}-ai-http`;
let activeUserId = "";
let inactiveUserId = "";
let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let restoreAuth: (() => void) | undefined;

const fakeProvider: TAiProvider = {
  async generateStructured({ responseSchema }) {
    const properties = responseSchema.properties as Record<string, unknown>;
    return "hashtags" in properties
      ? { hashtags: ["#TypeScript", "typescript", "Node_JS"] }
      : { content: " Improved AI suggestion " };
  },
};

const createTestApp = (provider: TAiProvider, limiter = createAiRateLimit()) => {
  const app: Application = express();
  app.use(express.json());
  app.use(
    "/api/v1/ai",
    createAiRoutes(createAiController(createAiService(provider)), limiter),
  );
  app.use(notFound);
  app.use(globalErrorHandler);
  return app;
};

const request = async (
  path: string,
  body: unknown,
  userId?: string,
  origin = baseUrl,
) => {
  const response = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(userId ? { "x-test-user-id": userId } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

before(async () => {
  activeUserId = (
    await createTestUser({ cleanup, runId, label: "active" })
  ).id;
  inactiveUserId = (
    await createTestUser({
      cleanup,
      runId,
      label: "inactive",
      status: UserStatus.SUSPENDED,
    })
  ).id;
  restoreAuth = installAuthSessionStub(`${runId}-session`);
  const server = await startTestServer(createTestApp(fakeProvider));
  baseUrl = server.baseUrl;
  closeServer = server.close;
});

after(async () => {
  restoreAuth?.();
  await closeServer?.();
  try {
    await cleanup.run();
  } finally {
    await prisma.$disconnect();
  }
});

test("AI routes require an active authenticated account", async () => {
  const unauthenticated = await request("/api/v1/ai/posts/improve", {
    content: "draft",
  });
  const inactive = await request(
    "/api/v1/ai/posts/improve",
    { content: "draft" },
    inactiveUserId,
  );
  assert.equal(unauthenticated.status, 401);
  assert.equal(inactive.status, 403);
  assert.equal(inactive.body.message, "This account is not active");
});

test("AI fake-provider routes return standard suggestion envelopes", async () => {
  const cases = [
    ["/api/v1/ai/posts/improve", { content: "draft" }],
    ["/api/v1/ai/posts/generate", { topic: "TypeScript" }],
    ["/api/v1/ai/comments/improve", { content: "comment" }],
    ["/api/v1/ai/profiles/improve", { field: "HEADLINE", content: "title" }],
  ] as const;
  for (const [path, body] of cases) {
    const result = await request(path, body, activeUserId);
    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.statusCode, 200);
    assert.deepEqual(result.body.data, { content: "Improved AI suggestion" });
  }

  const hashtags = await request(
    "/api/v1/ai/posts/hashtags",
    { content: "TypeScript post" },
    activeUserId,
  );
  assert.equal(hashtags.status, 200);
  assert.deepEqual(hashtags.body.data, {
    hashtags: ["typescript", "node_js"],
  });
});

test("AI suggestions do not mutate domain tables", async () => {
  const before = await Promise.all([
    prisma.post.count(),
    prisma.comment.count(),
    prisma.profile.count(),
    prisma.hashtag.count(),
    prisma.notification.count(),
  ]);
  const result = await request(
    "/api/v1/ai/posts/improve",
    { content: "No mutation" },
    activeUserId,
  );
  const afterCounts = await Promise.all([
    prisma.post.count(),
    prisma.comment.count(),
    prisma.profile.count(),
    prisma.hashtag.count(),
    prisma.notification.count(),
  ]);
  assert.equal(result.status, 200);
  assert.deepEqual(afterCounts, before);
});

test("AI limiter is shared across routes and charges invalid requests", async () => {
  const server = await startTestServer(createTestApp(fakeProvider));
  try {
    for (let index = 0; index < 20; index += 1) {
      const path = index % 2 ? "/api/v1/ai/posts/improve" : "/api/v1/ai/comments/improve";
      const result = await request(path, {}, activeUserId, server.baseUrl);
      assert.equal(result.status, 400);
    }
    const limited = await request(
      "/api/v1/ai/posts/improve",
      {},
      activeUserId,
      server.baseUrl,
    );
    assert.equal(limited.status, 429);
  } finally {
    await server.close();
  }
});

test("AI provider errors use stable Nexora HTTP formatting", async () => {
  for (const [statusCode, message] of [
    [422, "AI could not generate a safe response"],
    [500, "AI service configuration error"],
    [502, "AI provider returned an invalid response"],
    [503, "AI service is temporarily unavailable"],
  ] as const) {
    const server = await startTestServer(
      createTestApp({
        async generateStructured() {
          throw new AppError(statusCode, message);
        },
      }),
    );
    try {
      const result = await request(
        "/api/v1/ai/posts/improve",
        { content: "draft" },
        activeUserId,
        server.baseUrl,
      );
      assert.equal(result.status, statusCode);
      assert.equal(result.body.message, message);
    } finally {
      await server.close();
    }
  }
});

test("deferred AI routes remain absent", async () => {
  for (const path of ["/api/v1/ai/ask", "/api/v1/ai/search"]) {
    const result = await request(path, {}, activeUserId);
    assert.equal(result.status, 404);
  }
});
