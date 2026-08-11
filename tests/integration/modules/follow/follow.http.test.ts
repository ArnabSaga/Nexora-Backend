import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { UserStatus } from "../../../../src/generated/prisma/client";
import app from "../../../../src/app";
import { prisma } from "../../../../src/app/lib/prisma";
import { FOLLOW_MAX_PAGE } from "../../../../src/app/module/follow/follow.constant";
import { installAuthSessionStub } from "../../../support/auth/auth-session.stub";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestFollow } from "../../../support/fixtures/follow.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";
import { startTestServer } from "../../../support/server/test-server";

const testRunId = process.env.TEST_RUN_ID;

if (!testRunId) {
  throw new Error("TEST_RUN_ID is required; use the integration test runner");
}

const runId = `${testRunId}-follow-http`;
const cleanup = createTestCleanup();
type TFixtureUser = Awaited<ReturnType<typeof createTestUser>>;

const users = {} as Record<
  "target" | "mutation" | "deletion" | "limit" | "otherLimit",
  TFixtureUser
>;
let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let restoreAuth: (() => void) | undefined;

const request = async ({
  userId,
  method,
  path,
}: {
  userId?: string;
  method: "GET" | "POST" | "DELETE";
  path: string;
}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: userId ? { "x-test-user-id": userId } : {},
  });

  return { status: response.status, body: await response.json() };
};

before(async () => {
  users.target = await createTestUser({ cleanup, runId, label: "target" });
  users.mutation = await createTestUser({ cleanup, runId, label: "mutation" });
  users.deletion = await createTestUser({ cleanup, runId, label: "deletion" });
  users.limit = await createTestUser({ cleanup, runId, label: "limit" });
  users.otherLimit = await createTestUser({ cleanup, runId, label: "other-limit" });

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

test("Follow HTTP routes preserve precedence and authentication boundaries", async () => {
  const suggestions = await request({
    userId: users.mutation.id,
    method: "GET",
    path: "/api/v1/users/suggestions",
  });
  const followers = await request({
    method: "GET",
    path: `/api/v1/users/${users.target.id}/followers`,
  });
  const unauthenticated = await request({
    method: "POST",
    path: `/api/v1/users/${users.target.id}/follow`,
  });

  assert.equal(suggestions.status, 200);
  assert.equal(followers.status, 200);
  assert.equal(unauthenticated.status, 401);
});

test("Follow HTTP validation is strict", async () => {
  const invalidId = await request({
    userId: users.mutation.id,
    method: "POST",
    path: "/api/v1/users/c1/follow",
  });
  const invalidQuery = await request({
    method: "GET",
    path: `/api/v1/users/${users.target.id}/followers?page=01`,
  });
  const unknownQuery = await request({
    method: "GET",
    path: `/api/v1/users/${users.target.id}/following?sortBy=createdAt`,
  });
  const maxPage = await request({
    method: "GET",
    path: `/api/v1/users/${users.target.id}/followers?page=${FOLLOW_MAX_PAGE}`,
  });
  const overMaxPage = await request({
    method: "GET",
    path: `/api/v1/users/${users.target.id}/followers?page=${FOLLOW_MAX_PAGE + 1}`,
  });

  assert.equal(invalidId.status, 400);
  assert.equal(invalidQuery.status, 400);
  assert.equal(unknownQuery.status, 400);
  assert.equal(maxPage.status, 200);
  assert.equal(overMaxPage.status, 400);
});

test("Follow HTTP mutations return creation, duplicate, and self contracts", async () => {
  const suspended = await createTestUser({
    cleanup,
    runId,
    label: "post-suspended",
    status: UserStatus.SUSPENDED,
  });
  const softDeleted = await createTestUser({
    cleanup,
    runId,
    label: "post-soft-deleted",
    deletedAt: new Date("2099-01-01T00:00:00.000Z"),
  });
  cleanup.add("http-follow-pair", () =>
    prisma.follow.deleteMany({
      where: { followerId: users.mutation.id, followingId: users.target.id },
    }),
  );
  const first = await request({
    userId: users.mutation.id,
    method: "POST",
    path: `/api/v1/users/${users.target.id}/follow`,
  });
  const duplicate = await request({
    userId: users.mutation.id,
    method: "POST",
    path: `/api/v1/users/${users.target.id}/follow`,
  });
  const self = await request({
    userId: users.mutation.id,
    method: "POST",
    path: `/api/v1/users/${users.mutation.id}/follow`,
  });
  const suspendedTarget = await request({
    userId: users.mutation.id,
    method: "POST",
    path: `/api/v1/users/${suspended.id}/follow`,
  });
  const deletedTarget = await request({
    userId: users.mutation.id,
    method: "POST",
    path: `/api/v1/users/${softDeleted.id}/follow`,
  });

  assert.equal(first.status, 201);
  assert.equal(first.body.message, "User followed successfully");
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.body.message, "Already following");
  assert.equal(self.status, 400);
  assert.equal(suspendedTarget.status, 404);
  assert.equal(deletedTarget.status, 404);
});

test("Follow HTTP unfollow responses are identical across valid target states", async () => {
  const suspended = await createTestUser({ cleanup, runId, label: "delete-suspended" });
  const softDeleted = await createTestUser({
    cleanup,
    runId,
    label: "delete-soft-deleted",
    deletedAt: new Date("2099-01-01T00:01:00.000Z"),
  });
  await createTestFollow({
    cleanup,
    followerId: users.deletion.id,
    followingId: users.target.id,
  });
  await prisma.user.update({
    where: { id: suspended.id },
    data: { status: UserStatus.SUSPENDED },
  });
  const paths = [
    `/api/v1/users/${users.target.id}/follow`,
    `/api/v1/users/${suspended.id}/follow`,
    `/api/v1/users/${softDeleted.id}/follow`,
    "/api/v1/users/ck1234567890123456789012/follow",
  ];
  const responses = [];

  for (const path of paths) {
    responses.push(
      await request({ userId: users.deletion.id, method: "DELETE", path }),
    );
  }

  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, responses[0].body);
  }

  const self = await request({
    userId: users.deletion.id,
    method: "DELETE",
    path: `/api/v1/users/${users.deletion.id}/follow`,
  });
  assert.equal(self.status, 400);
});

test("Follow limiter blocks request 61 without consuming Reaction or Vote capacity", async () => {
  const targetId = "ck1234567890123456789012";

  for (let index = 0; index < 60; index += 1) {
    const response = await request({
      userId: users.limit.id,
      method: "DELETE",
      path: `/api/v1/users/${targetId}/follow`,
    });
    assert.equal(response.status, 200, `Request ${index + 1} should pass`);
  }

  const blocked = await request({
    userId: users.limit.id,
    method: "DELETE",
    path: `/api/v1/users/${targetId}/follow`,
  });
  const otherUser = await request({
    userId: users.otherLimit.id,
    method: "DELETE",
    path: `/api/v1/users/${targetId}/follow`,
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
