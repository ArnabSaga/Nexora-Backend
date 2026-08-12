import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import app from "../../../../src/app";
import { prisma } from "../../../../src/app/lib/prisma";
import { installAuthSessionStub } from "../../../support/auth/auth-session.stub";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestUser } from "../../../support/fixtures/user.fixture";
import { startTestServer } from "../../../support/server/test-server";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId)
  throw new Error("TEST_RUN_ID is required; use the integration runner");

const runId = testRunId + "-community-rule-http";
const cleanup = createTestCleanup();
type TUser = Awaited<ReturnType<typeof createTestUser>>;
let owner: TUser;
let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let restoreAuth: (() => void) | undefined;

const request = async ({
  method,
  path,
  userId,
  body,
}: {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  userId?: string;
  body?: unknown;
}) => {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(userId && { "x-test-user-id": userId }),
      ...(body !== undefined && { "content-type": "application/json" }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  return { status: response.status, body: await response.json() };
};

before(async () => {
  owner = await createTestUser({ cleanup, runId, label: "owner" });
  restoreAuth = installAuthSessionStub(runId + "-session");
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

test("Community Rule HTTP routes preserve CRUD responses and public reads", async () => {
  const createdCommunity = await request({
    method: "POST",
    path: "/api/v1/communities",
    userId: owner.id,
    body: { name: runId + " Community" },
  });
  assert.equal(createdCommunity.status, 201);
  const community = createdCommunity.body.data as { id: string };
  cleanup.add("community-rule-http:" + community.id, () =>
    prisma.community.deleteMany({ where: { id: community.id } }),
  );

  const unauthenticated = await request({
    method: "POST",
    path: "/api/v1/communities/" + community.id + "/rules",
    body: { title: "No auth" },
  });
  assert.equal(unauthenticated.status, 401);

  const created = await request({
    method: "POST",
    path: "/api/v1/communities/" + community.id + "/rules",
    userId: owner.id,
    body: { title: "  Be constructive  ", description: "  Be specific  " },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.title, "Be constructive");
  assert.equal(created.body.data.orderNo, 0);
  const rule = created.body.data as { id: string };
  cleanup.add("community-rule-http-rule:" + rule.id, () =>
    prisma.communityRule.deleteMany({ where: { id: rule.id } }),
  );

  const listed = await request({
    method: "GET",
    path: "/api/v1/communities/" + community.id + "/rules",
  });
  assert.equal(listed.status, 200);
  assert.equal(listed.body.data.length, 1);

  const updated = await request({
    method: "PATCH",
    path: "/api/v1/community-rules/" + rule.id,
    userId: owner.id,
    body: { description: null, orderNo: 10 },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.description, null);
  assert.equal(updated.body.data.orderNo, 10);

  const deleted = await request({
    method: "DELETE",
    path: "/api/v1/community-rules/" + rule.id,
    userId: owner.id,
  });
  const repeated = await request({
    method: "DELETE",
    path: "/api/v1/community-rules/" + rule.id,
    userId: owner.id,
  });
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.data, null);
  assert.equal(repeated.status, 404);
});

test("Community Rule HTTP validation is strict for params, bodies, and queries", async () => {
  const targetId = "ck1234567890123456789012";
  const malformed = await request({
    method: "POST",
    path: "/api/v1/communities/c1/rules",
    userId: owner.id,
    body: { title: "Rule" },
  });
  const emptyPatch = await request({
    method: "PATCH",
    path: "/api/v1/community-rules/" + targetId,
    userId: owner.id,
    body: {},
  });
  const unknownQuery = await request({
    method: "GET",
    path: "/api/v1/communities/" + targetId + "/rules?page=1",
  });
  const invalidOrder = await request({
    method: "POST",
    path: "/api/v1/communities/" + targetId + "/rules",
    userId: owner.id,
    body: { title: "Rule", orderNo: 1.5 },
  });

  assert.equal(malformed.status, 400);
  assert.equal(emptyPatch.status, 400);
  assert.equal(unknownQuery.status, 400);
  assert.equal(invalidOrder.status, 400);
});
