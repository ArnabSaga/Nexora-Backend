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

const runId = `${testRunId}-community-member-http`;
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

const createCommunity = async (
  label: string,
  visibility: CommunityVisibility = CommunityVisibility.PUBLIC,
) => {
  const created = await request({
    method: "POST",
    path: "/api/v1/communities",
    userId: users.owner.id,
    body: { name: `${runId} ${label}`, visibility },
  });
  assert.equal(created.status, 201);
  const community = created.body.data as { id: string; slug: string };
  cleanup.add(`community-member-http:${community.id}`, () =>
    prisma.community.deleteMany({ where: { id: community.id } }),
  );
  return community;
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

test("Community Member HTTP routes preserve all six contracts and precedence", async () => {
  const community = await createCommunity("Member Routes");

  const unauthenticated = await request({
    method: "POST",
    path: `/api/v1/communities/${community.id}/join`,
  });
  assert.equal(unauthenticated.status, 401);

  const joined = await request({
    method: "POST",
    path: `/api/v1/communities/${community.id}/join`,
    userId: users.member.id,
  });
  const members = await request({
    method: "GET",
    path: `/api/v1/communities/${community.id}/members`,
  });
  assert.equal(joined.status, 201);
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
  const left = await request({
    method: "DELETE",
    path: `/api/v1/communities/${community.id}/leave`,
    userId: users.member.id,
  });
  assert.equal(removed.status, 200);
  assert.equal(left.status, 200);
});

test("PRIVATE join remains available without exposing metadata", async () => {
  const community = await createCommunity(
    "Private Member Route",
    CommunityVisibility.PRIVATE,
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

test("Community Member HTTP validation rejects malformed IDs and pagination", async () => {
  const malformed = await request({
    method: "POST",
    path: "/api/v1/communities/c1/join",
    userId: users.member.id,
  });
  const excessivePage = await request({
    method: "GET",
    path: "/api/v1/communities/ck1234567890123456789012/members?page=10001",
  });

  assert.equal(malformed.status, 400);
  assert.equal(excessivePage.status, 400);
});

test("Core and Member routers share one Community limiter store", async () => {
  const targetId = "ck1234567890123456789012";

  for (let index = 0; index < 30; index += 1) {
    const response = await request({
      userId: users.limit.id,
      method: "DELETE",
      path: `/api/v1/communities/${targetId}/leave`,
    });
    assert.notEqual(response.status, 429, `Member request ${index + 1}`);
  }

  for (let index = 0; index < 30; index += 1) {
    const response = await request({
      userId: users.limit.id,
      method: "DELETE",
      path: `/api/v1/communities/${targetId}`,
    });
    assert.notEqual(response.status, 429, `Core request ${index + 1}`);
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
