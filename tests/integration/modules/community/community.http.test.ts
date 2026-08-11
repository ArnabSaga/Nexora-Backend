import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { CommunityVisibility } from "../../../../src/generated/prisma/client";
import app from "../../../../src/app";
import { prisma } from "../../../../src/app/lib/prisma";
import { installAuthSessionStub } from "../../../support/auth/auth-session.stub";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestUser } from "../../../support/fixtures/user.fixture";
import { startTestServer } from "../../../support/server/test-server";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId)
  throw new Error("TEST_RUN_ID is required; use the integration runner");

const runId = `${testRunId}-community-http`;
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
  const response = await fetch(`${baseUrl}${path}`, {
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

test("Community Core HTTP routes preserve authentication and CRUD contracts", async () => {
  const unauthenticated = await request({
    method: "POST",
    path: "/api/v1/communities",
    body: { name: `${runId} unauthenticated` },
  });
  assert.equal(unauthenticated.status, 401);

  const created = await request({
    method: "POST",
    path: "/api/v1/communities",
    userId: owner.id,
    body: {
      name: `${runId} HTTP Community`,
      visibility: CommunityVisibility.PUBLIC,
    },
  });
  assert.equal(created.status, 201);
  const community = created.body.data as { id: string; slug: string };
  cleanup.add(`community-http:${community.id}`, () =>
    prisma.community.deleteMany({ where: { id: community.id } }),
  );

  const list = await request({ method: "GET", path: "/api/v1/communities" });
  const detail = await request({
    method: "GET",
    path: `/api/v1/communities/${community.slug}`,
  });
  const updated = await request({
    method: "PATCH",
    path: `/api/v1/communities/${community.id}`,
    userId: owner.id,
    body: { description: "Updated through HTTP" },
  });

  assert.equal(list.status, 200);
  assert.equal(detail.status, 200);
  assert.equal(updated.status, 200);

  const deleted = await request({
    method: "DELETE",
    path: `/api/v1/communities/${community.id}`,
    userId: owner.id,
  });
  const repeated = await request({
    method: "DELETE",
    path: `/api/v1/communities/${community.id}`,
    userId: owner.id,
  });
  assert.equal(deleted.status, 200);
  assert.deepEqual(repeated.body, deleted.body);
});

test("Community Core HTTP validation enforces strict payloads and pagination ceilings", async () => {
  const excessivePage = await request({
    method: "GET",
    path: "/api/v1/communities?page=10001",
  });
  const maximumPage = await request({
    method: "GET",
    path: "/api/v1/communities?page=10000&limit=1",
  });
  const unknownBody = await request({
    method: "POST",
    path: "/api/v1/communities",
    userId: owner.id,
    body: { name: "Strict Community", slug: "manual-slug" },
  });

  assert.equal(maximumPage.status, 200);
  assert.equal(excessivePage.status, 400);
  assert.equal(unknownBody.status, 400);
});
