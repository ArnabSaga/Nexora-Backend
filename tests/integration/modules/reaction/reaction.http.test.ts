import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  PostVisibility,
  ReactionType,
} from "../../../../src/generated/prisma/client";
import app from "../../../../src/app";
import { prisma } from "../../../../src/app/lib/prisma";
import { installAuthSessionStub } from "../../../support/auth/auth-session.stub";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestPostReaction } from "../../../support/fixtures/reaction.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";
import { startTestServer } from "../../../support/server/test-server";

const testRunId = process.env.TEST_RUN_ID;

if (!testRunId) {
  throw new Error("TEST_RUN_ID is required; use the integration test runner");
}

const runId = `${testRunId}-reaction-http`;
const cleanup = createTestCleanup();

type TFixtureUser = Awaited<ReturnType<typeof createTestUser>>;

const users = {} as Record<
  "author" | "validation" | "visibility" | "deletion" | "limit" | "otherLimit",
  TFixtureUser
>;
const fixtures = {} as { publicPostId: string; privatePostId: string };

let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let restoreAuth: (() => void) | undefined;

const request = async ({
  userId,
  method,
  path,
  body,
}: {
  userId: string;
  method: "POST" | "DELETE";
  path: string;
  body?: unknown;
}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-user-id": userId,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return { status: response.status, body: await response.json() };
};

before(async () => {
  users.author = await createTestUser({ cleanup, runId, label: "author" });
  users.validation = await createTestUser({ cleanup, runId, label: "validation" });
  users.visibility = await createTestUser({ cleanup, runId, label: "visibility" });
  users.deletion = await createTestUser({ cleanup, runId, label: "deletion" });
  users.limit = await createTestUser({ cleanup, runId, label: "limit" });
  users.otherLimit = await createTestUser({ cleanup, runId, label: "other-limit" });

  const publicPost = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
  });
  const privatePost = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
    visibility: PostVisibility.PRIVATE,
  });

  fixtures.publicPostId = publicPost.id;
  fixtures.privatePostId = privatePost.id;

  restoreAuth = installAuthSessionStub(`${runId}-session`);
  const testServer = await startTestServer(app);
  baseUrl = testServer.baseUrl;
  closeServer = testServer.close;
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

test("HTTP routes return real validation, visibility, and success statuses", async () => {
  const invalid = await request({
    userId: users.validation.id,
    method: "DELETE",
    path: "/api/v1/posts/c1/reactions",
  });
  const hidden = await request({
    userId: users.visibility.id,
    method: "POST",
    path: `/api/v1/posts/${fixtures.privatePostId}/reactions`,
    body: { reactionType: ReactionType.LIKE },
  });
  const visible = await request({
    userId: users.visibility.id,
    method: "POST",
    path: `/api/v1/posts/${fixtures.publicPostId}/reactions`,
    body: { reactionType: ReactionType.LIKE },
  });

  assert.equal(invalid.status, 400);
  assert.equal(hidden.status, 404);
  assert.equal(visible.status, 200);
});

test("HTTP DELETE responses are identical across target states", async () => {
  const deletedTarget = await createTestPost({
    cleanup,
    runId,
    authorId: users.author.id,
  });

  await createTestPostReaction({
    cleanup,
    userId: users.deletion.id,
    postId: deletedTarget.id,
  });
  await prisma.post.delete({ where: { id: deletedTarget.id } });

  const paths = [
    `/api/v1/posts/${fixtures.publicPostId}/reactions`,
    `/api/v1/posts/${fixtures.privatePostId}/reactions`,
    `/api/v1/posts/${deletedTarget.id}/reactions`,
    "/api/v1/posts/ck1234567890123456789012/reactions",
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
});

test("HTTP Reaction limiter uses the authenticated user and blocks request 121", async () => {
  const path = "/api/v1/posts/ck1234567890123456789012/reactions";

  for (let index = 0; index < 120; index += 1) {
    const response = await request({
      userId: users.limit.id,
      method: "DELETE",
      path,
    });
    assert.equal(response.status, 200, `Request ${index + 1} should pass`);
  }

  const blocked = await request({
    userId: users.limit.id,
    method: "DELETE",
    path,
  });
  const otherUser = await request({
    userId: users.otherLimit.id,
    method: "DELETE",
    path,
  });

  assert.equal(blocked.status, 429);
  assert.equal(otherUser.status, 200);
});
