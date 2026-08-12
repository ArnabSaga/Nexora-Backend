import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import app from "../../../../src/app";
import { prisma } from "../../../../src/app/lib/prisma";
import { installAuthSessionStub } from "../../../support/auth/auth-session.stub";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestNotification } from "../../../support/fixtures/notification.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";
import { startTestServer } from "../../../support/server/test-server";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId)
  throw new Error("TEST_RUN_ID is required; use the integration runner");
const runId = `${testRunId}-notification-http`;
const cleanup = createTestCleanup();
let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let restoreAuth: (() => void) | undefined;
let userId = "";
let limitUserId = "";
let notificationId = "";

const request = async (
  method: "GET" | "PATCH" | "DELETE",
  path: string,
  auth = true,
  requestUserId = userId,
  body?: unknown,
) => {
  const headers: Record<string, string> = {};
  if (auth) headers["x-test-user-id"] = requestUserId;
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

before(async () => {
  const user = await createTestUser({ cleanup, runId, label: "http-user" });
  userId = user.id;
  const limitUser = await createTestUser({
    cleanup,
    runId,
    label: "http-limit",
  });
  limitUserId = limitUser.id;
  const notification = await createTestNotification({
    cleanup,
    receiverId: userId,
    sourceKey: `${runId}:http`,
  });
  notificationId = notification.id;
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

test("Notification HTTP routes preserve precedence, privacy, and contracts", async () => {
  assert.equal(
    (await request("GET", "/api/v1/notifications", false)).status,
    401,
  );
  assert.equal(
    (await request("GET", "/api/v1/notifications?limit=51&extra=x")).status,
    400,
  );
  assert.equal(
    (await request("PATCH", "/api/v1/notifications/read-all")).status,
    200,
  );
  assert.equal(
    (await request("PATCH", "/api/v1/notifications/read-all", true, userId, {}))
      .status,
    200,
  );
  assert.equal(
    (await request("PATCH", `/api/v1/notifications/${notificationId}/read`))
      .status,
    200,
  );
  assert.equal(
    (await request("DELETE", `/api/v1/notifications/${notificationId}`)).status,
    200,
  );
  assert.equal(
    (await request("DELETE", `/api/v1/notifications/${notificationId}`)).status,
    200,
  );
  for (const body of [null, [], { extra: true }]) {
    assert.equal(
      (
        await request(
          "PATCH",
          "/api/v1/notifications/read-all",
          true,
          userId,
          body,
        )
      ).status,
      400,
    );
  }
  assert.equal(
    (await request("PATCH", "/api/v1/notifications/read-all?extra=true"))
      .status,
    400,
  );
});

test("Notification limiter blocks mutation 121 without consuming Bookmark capacity", async () => {
  const missingId = "ck1234567890123456789012";
  for (let index = 0; index < 120; index += 1) {
    const response = await request(
      "DELETE",
      `/api/v1/notifications/${missingId}`,
      true,
      limitUserId,
    );
    assert.equal(response.status, 200);
  }
  const blocked = await request(
    "DELETE",
    `/api/v1/notifications/${missingId}`,
    true,
    limitUserId,
  );
  const bookmark = await request(
    "DELETE",
    `/api/v1/posts/${missingId}/bookmarks`,
    true,
    limitUserId,
  );
  assert.equal(blocked.status, 429);
  assert.notEqual(bookmark.status, 429);
});
