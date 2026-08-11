import assert from "node:assert/strict";
import test from "node:test";
import {
  FOLLOW_MAX_LIMIT,
  FOLLOW_MAX_PAGE,
} from "../../../../src/app/module/follow/follow.constant";
import { FollowValidation } from "../../../../src/app/module/follow/follow.validation";

const validCuid = "ck1234567890123456789012";

test("Follow validation accepts strict IDs and canonical pagination", () => {
  assert.equal(
    FollowValidation.userIdParam.safeParse({ userId: validCuid }).success,
    true,
  );
  assert.deepEqual(FollowValidation.listQuery.parse({}), {});
  assert.deepEqual(FollowValidation.listQuery.parse({ page: "1", limit: "20" }), {
    page: 1,
    limit: 20,
  });
  assert.equal(
    FollowValidation.listQuery.safeParse({
      page: String(FOLLOW_MAX_PAGE),
    }).success,
    true,
  );
  assert.equal(
    FollowValidation.listQuery.safeParse({ limit: FOLLOW_MAX_LIMIT }).success,
    true,
  );
});

test("Follow validation rejects malformed or normalized IDs", () => {
  for (const userId of [
    "c1",
    "CINVALID",
    "550e8400-e29b-41d4-a716-446655440000",
    ` ${validCuid} `,
  ]) {
    assert.equal(
      FollowValidation.userIdParam.safeParse({ userId }).success,
      false,
      `Expected ${JSON.stringify(userId)} to be rejected`,
    );
  }
});

test("Follow validation rejects non-canonical pagination and unknown keys", () => {
  const invalidValues: unknown[] = [
    "",
    " ",
    " 1 ",
    "0",
    "-1",
    "+1",
    "01",
    "1.0",
    "1.5",
    "1e2",
    "0x10",
    "1abc",
    String(FOLLOW_MAX_PAGE + 1),
    Number.MAX_SAFE_INTEGER + 1,
    Number.MAX_SAFE_INTEGER,
    "9007199254740992",
    [],
    {},
    true,
    null,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ];

  for (const value of invalidValues) {
    assert.equal(
      FollowValidation.listQuery.safeParse({ page: value }).success,
      false,
      `Expected ${JSON.stringify(value)} to be rejected`,
    );
  }

  assert.equal(
    FollowValidation.listQuery.safeParse({ limit: FOLLOW_MAX_LIMIT + 1 })
      .success,
    false,
  );
  assert.equal(
    FollowValidation.listQuery.safeParse({ page: 1, sortBy: "createdAt" })
      .success,
    false,
  );
});
