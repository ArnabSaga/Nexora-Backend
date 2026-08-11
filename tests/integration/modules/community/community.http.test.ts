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
const users = {} as Record<
  "owner" | "member" | "secondMember" | "limit" | "otherLimit",
  TUser
>;
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
  users.owner = await createTestUser({ cleanup, runId, label: "owner" });
  users.member = await createTestUser({ cleanup, runId, label: "member" });
  users.secondMember = await createTestUser({
    cleanup,
    runId,
    label: "second-member",
  });
  users.limit = await createTestUser({ cleanup, runId, label: "limit" });
  users.otherLimit = await createTestUser({
    cleanup,
    runId,
    label: "other-limit",
  });
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

test("Community HTTP routes preserve authentication, precedence, and mutation contracts", async () => {
  const unauthenticated = await request({
    method: "POST",
    path: "/api/v1/communities",
    body: { name: `${runId} unauthenticated` },
  });
  assert.equal(unauthenticated.status, 401);

  const created = await request({
    method: "POST",
    path: "/api/v1/communities",
    userId: users.owner.id,
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
  assert.equal(list.status, 200);
  assert.equal(detail.status, 200);

  const joined = await request({
    method: "POST",
    path: `/api/v1/communities/${community.id}/join`,
    userId: users.member.id,
  });
  assert.equal(joined.status, 201);

  const members = await request({
    method: "GET",
    path: `/api/v1/communities/${community.id}/members`,
  });
  assert.equal(members.status, 200);

  const role = await request({
    method: "PATCH",
    path: `/api/v1/communities/${community.id}/members/${users.member.id}/role`,
    userId: users.owner.id,
    body: { role: "MODERATOR" },
  });
  const banned = await request({
    method: "PATCH",
    path: `/api/v1/communities/${community.id}/members/${users.member.id}/status`,
    userId: users.owner.id,
    body: { status: "BANNED" },
  });
  const unbanned = await request({
    method: "PATCH",
    path: `/api/v1/communities/${community.id}/members/${users.member.id}/status`,
    userId: users.owner.id,
    body: { status: "ACTIVE" },
  });
  assert.equal(role.status, 200);
  assert.equal(banned.status, 200);
  assert.equal(unbanned.status, 200);

  await request({
    method: "POST",
    path: `/api/v1/communities/${community.id}/join`,
    userId: users.secondMember.id,
  });
  const removed = await request({
    method: "DELETE",
    path: `/api/v1/communities/${community.id}/members/${users.secondMember.id}`,
    userId: users.owner.id,
  });
  assert.equal(removed.status, 200);

  const updated = await request({
    method: "PATCH",
    path: `/api/v1/communities/${community.id}`,
    userId: users.owner.id,
    body: { description: "Updated through HTTP" },
  });
  const left = await request({
    method: "DELETE",
    path: `/api/v1/communities/${community.id}/leave`,
    userId: users.member.id,
  });
  assert.equal(updated.status, 200);
  assert.equal(left.status, 200);

  const deleted = await request({
    method: "DELETE",
    path: `/api/v1/communities/${community.id}`,
    userId: users.owner.id,
  });
  const repeated = await request({
    method: "DELETE",
    path: `/api/v1/communities/${community.id}`,
    userId: users.owner.id,
  });
  assert.equal(deleted.status, 200);
  assert.deepEqual(repeated.body, deleted.body);
});

test("Community HTTP validation enforces strict IDs and pagination ceilings", async () => {
  const malformed = await request({
    method: "POST",
    path: "/api/v1/communities/c1/join",
    userId: users.member.id,
  });
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
    userId: users.owner.id,
    body: { name: "Strict Community", slug: "manual-slug" },
  });

  assert.equal(malformed.status, 400);
  assert.equal(maximumPage.status, 200);
  assert.equal(excessivePage.status, 400);
  assert.equal(unknownBody.status, 400);
});

test("PRIVATE Community join does not expose metadata while membership is pending", async () => {
  const created = await request({
    method: "POST",
    path: "/api/v1/communities",
    userId: users.owner.id,
    body: {
      name: `${runId} Private HTTP Community`,
      visibility: CommunityVisibility.PRIVATE,
    },
  });
  assert.equal(created.status, 201);
  const community = created.body.data as { id: string; slug: string };
  cleanup.add(`community-private-http:${community.id}`, () =>
    prisma.community.deleteMany({ where: { id: community.id } }),
  );

  const hiddenBefore = await request({
    method: "GET",
    path: `/api/v1/communities/${community.slug}`,
    userId: users.member.id,
  });
  const pending = await request({
    method: "POST",
    path: `/api/v1/communities/${community.id}/join`,
    userId: users.member.id,
  });
  const hiddenAfter = await request({
    method: "GET",
    path: `/api/v1/communities/${community.slug}`,
    userId: users.member.id,
  });

  assert.equal(hiddenBefore.status, 404);
  assert.equal(pending.status, 202);
  assert.equal(pending.body.data.status, "PENDING");
  assert.equal(hiddenAfter.status, 404);
});

test("Community limiter blocks request 61 without consuming Reaction or Vote capacity", async () => {
  const targetId = "ck1234567890123456789012";

  for (let index = 0; index < 60; index += 1) {
    const response = await request({
      userId: users.limit.id,
      method: "DELETE",
      path: `/api/v1/communities/${targetId}/leave`,
    });
    assert.equal(response.status, 200, `Request ${index + 1} should pass`);
  }

  const blocked = await request({
    userId: users.limit.id,
    method: "DELETE",
    path: `/api/v1/communities/${targetId}/leave`,
  });
  const otherUser = await request({
    userId: users.otherLimit.id,
    method: "DELETE",
    path: `/api/v1/communities/${targetId}/leave`,
  });
  const reaction = await request({
    userId: users.limit.id,
    method: "DELETE",
    path: `/api/v1/posts/${targetId}/reactions`,
  });
  const vote = await request({
    userId: users.limit.id,
    method: "DELETE",
    path: `/api/v1/posts/${targetId}/votes`,
  });

  assert.equal(blocked.status, 429);
  assert.equal(otherUser.status, 200);
  assert.equal(reaction.status, 200);
  assert.equal(vote.status, 200);
});
