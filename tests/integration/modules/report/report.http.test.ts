import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import app from "../../../../src/app";
import { UserRole } from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import { installAuthSessionStub } from "../../../support/auth/auth-session.stub";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";
import { startTestServer } from "../../../support/server/test-server";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId)
  throw new Error("TEST_RUN_ID is required; use the integration runner");
const runId = `${testRunId}-report-http`;
const cleanup = createTestCleanup();
let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let restoreAuth: (() => void) | undefined;
let reporterId = "";
let adminId = "";
let superAdminId = "";
let limitUserId = "";
let postId = "";
let reportId = "";

const request = async (
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  userId?: string,
  body?: unknown,
) => {
  const headers: Record<string, string> = {};
  if (userId) headers["x-test-user-id"] = userId;
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

before(async () => {
  const reporter = await createTestUser({
    cleanup,
    runId,
    label: "http-reporter",
  });
  const admin = await createTestUser({ cleanup, runId, label: "http-admin" });
  const superAdmin = await createTestUser({
    cleanup,
    runId,
    label: "http-super-admin",
  });
  const limit = await createTestUser({ cleanup, runId, label: "http-limit" });
  const author = await createTestUser({ cleanup, runId, label: "http-author" });
  await prisma.user.update({
    where: { id: admin.id },
    data: { role: UserRole.ADMIN },
  });
  await prisma.user.update({
    where: { id: superAdmin.id },
    data: { role: UserRole.SUPER_ADMIN },
  });
  const post = await createTestPost({ cleanup, runId, authorId: author.id });
  reporterId = reporter.id;
  adminId = admin.id;
  superAdminId = superAdmin.id;
  limitUserId = limit.id;
  postId = post.id;
  restoreAuth = installAuthSessionStub(`${runId}-session`);
  const server = await startTestServer(app);
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

test("Report HTTP routes enforce auth, platform roles, and status precedence", async () => {
  assert.equal((await request("POST", "/api/v1/reports")).status, 401);
  const created = await request("POST", "/api/v1/reports", reporterId, {
    target: { type: "POST", id: postId },
    reason: "SPAM",
  });
  assert.equal(created.status, 201);
  reportId = (created.body as { data: { id: string } }).data.id;
  cleanup.add(`http-report:${reportId}`, () =>
    prisma.postReport.deleteMany({ where: { id: reportId } }),
  );
  assert.equal(
    (await request("GET", "/api/v1/reports", reporterId)).status,
    403,
  );
  assert.equal(
    (await request("GET", "/api/v1/reports?limit=51", adminId)).status,
    400,
  );
  assert.equal(
    (await request("GET", `/api/v1/reports/${reportId}`, adminId)).status,
    200,
  );
  assert.equal(
    (await request("GET", `/api/v1/reports/${reportId}`, superAdminId)).status,
    200,
  );
  const updated = await request(
    "PATCH",
    `/api/v1/reports/${reportId}/status`,
    adminId,
    { status: "REVIEWED" },
  );
  assert.equal(updated.status, 200);
  assert.equal(
    (updated.body as { data: { status: string } }).data.status,
    "REVIEWED",
  );
  assert.equal(
    (
      await request(
        "PATCH",
        `/api/v1/reports/${reportId}/status`,
        superAdminId,
        { status: "REVIEWED" },
      )
    ).status,
    200,
  );
});

test("Report HTTP validation is strict for filters, targets, and status bodies", async () => {
  for (const path of [
    "/api/v1/reports?extra=true",
    "/api/v1/reports?status=UNKNOWN",
    "/api/v1/reports?targetType=ARTICLE",
    "/api/v1/reports?reason=UNKNOWN",
  ]) {
    assert.equal((await request("GET", path, adminId)).status, 400);
  }
  assert.equal(
    (
      await request("POST", "/api/v1/reports", reporterId, {
        target: { type: "ARTICLE", id: postId },
        reason: "SPAM",
      })
    ).status,
    400,
  );
  for (const body of [
    { status: "UNKNOWN" },
    { status: "REVIEWED", extra: true },
    {},
  ]) {
    assert.equal(
      (
        await request(
          "PATCH",
          `/api/v1/reports/${reportId}/status`,
          adminId,
          body,
        )
      ).status,
      400,
    );
  }
});

test("Report limiter blocks request 21 without consuming Notification capacity", async () => {
  const missingId = "cm12345678901234567890123";
  for (let index = 0; index < 20; index += 1) {
    const response = await request("POST", "/api/v1/reports", limitUserId, {
      target: { type: "POST", id: missingId },
      reason: "SPAM",
    });
    assert.notEqual(response.status, 429);
  }
  assert.equal(
    (
      await request("POST", "/api/v1/reports", limitUserId, {
        target: { type: "POST", id: missingId },
        reason: "SPAM",
      })
    ).status,
    429,
  );
  assert.notEqual(
    (await request("DELETE", `/api/v1/notifications/${missingId}`, limitUserId))
      .status,
    429,
  );
});
