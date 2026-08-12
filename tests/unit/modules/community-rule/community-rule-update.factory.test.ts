import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "../../../../src/generated/prisma/client";
import { createCommunityRuleUpdateService } from "../../../../src/app/module/community-rule/community-rule-update.factory";
import type { TCommunityRulePayload } from "../../../../src/app/module/community-rule/community-rule.select";
import AppError from "../../../../src/app/shared/errors/AppError";

const timestamp = new Date("2026-08-12T00:00:00.000Z");
const updatedRule = {
  id: "rule-id",
  communityId: "community-id",
  title: "Updated rule",
  description: null,
  orderNo: 10,
  createdAt: timestamp,
  updatedAt: timestamp,
} satisfies TCommunityRulePayload;

test("Community Rule update factory authorizes before updating", async () => {
  const calls: string[] = [];
  const service = createCommunityRuleUpdateService({
    authorizeRule: async (ruleId, requesterId) => {
      calls.push(`authorize:${ruleId}:${requesterId}`);
      return { id: "authorized-rule-id" };
    },
    updateRule: async (ruleId, payload) => {
      calls.push(`update:${ruleId}:${payload.title}`);
      return updatedRule;
    },
  });

  const result = await service.updateCommunityRule(
    "requested-rule-id",
    "requester-id",
    { title: "Updated rule" },
  );

  assert.equal(result, updatedRule);
  assert.deepEqual(calls, [
    "authorize:requested-rule-id:requester-id",
    "update:authorized-rule-id:Updated rule",
  ]);
});

test("Community Rule update factory does not update after failed authorization", async () => {
  const authorizationError = new Error("not authorized");
  let updateCalls = 0;
  const service = createCommunityRuleUpdateService({
    authorizeRule: async () => {
      throw authorizationError;
    },
    updateRule: async () => {
      updateCalls += 1;
      return updatedRule;
    },
  });

  await assert.rejects(
    service.updateCommunityRule("rule-id", "requester-id", {
      title: "Denied",
    }),
    (error: unknown) => error === authorizationError,
  );
  assert.equal(updateCalls, 0);
});

test("Community Rule update factory translates Prisma P2025 to privacy-safe 404", async () => {
  const missingRecordError = new Prisma.PrismaClientKnownRequestError(
    "Record not found",
    {
      code: "P2025",
      clientVersion: "test",
    },
  );
  const service = createCommunityRuleUpdateService({
    authorizeRule: async () => ({ id: "rule-id" }),
    updateRule: async () => {
      throw missingRecordError;
    },
  });

  await assert.rejects(
    service.updateCommunityRule("rule-id", "requester-id", {
      title: "Missing",
    }),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 404 &&
      error.message === "Community rule not found",
  );
});

test("Community Rule update factory preserves unrelated error identity", async () => {
  const originalError = new Error("database unavailable");
  const service = createCommunityRuleUpdateService({
    authorizeRule: async () => ({ id: "rule-id" }),
    updateRule: async () => {
      throw originalError;
    },
  });

  await assert.rejects(
    service.updateCommunityRule("rule-id", "requester-id", {
      title: "Unchanged",
    }),
    (error: unknown) => error === originalError,
  );
});
