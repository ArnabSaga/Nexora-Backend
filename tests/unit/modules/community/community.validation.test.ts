import assert from "node:assert/strict";
import test from "node:test";
import { CommunityVisibility } from "../../../../src/generated/prisma/client";
import {
  COMMUNITY_MAX_LIMIT,
  COMMUNITY_MAX_PAGE,
} from "../../../../src/app/module/community/community.constant";
import { CommunityValidation } from "../../../../src/app/module/community/community.validation";

const validCuid = "ck1234567890123456789012";

test("Community validation accepts canonical payloads and boundaries", () => {
  assert.equal(
    CommunityValidation.idParam.safeParse({ id: validCuid }).success,
    true,
  );
  assert.deepEqual(
    CommunityValidation.listQuery.parse({
      page: String(COMMUNITY_MAX_PAGE),
      limit: String(COMMUNITY_MAX_LIMIT),
    }),
    { page: COMMUNITY_MAX_PAGE, limit: COMMUNITY_MAX_LIMIT },
  );
  assert.equal(
    CommunityValidation.create.safeParse({
      name: "TypeScript Developers",
      visibility: CommunityVisibility.RESTRICTED,
    }).success,
    true,
  );
});

test("Community validation rejects normalized IDs and unsafe pagination", () => {
  for (const id of [
    "c1",
    ` ${validCuid} `,
    "550e8400-e29b-41d4-a716-446655440000",
  ]) {
    assert.equal(CommunityValidation.idParam.safeParse({ id }).success, false);
  }
  assert.equal(
    CommunityValidation.listQuery.safeParse({ page: COMMUNITY_MAX_PAGE + 1 })
      .success,
    false,
  );
  assert.equal(
    CommunityValidation.listQuery.safeParse({ limit: COMMUNITY_MAX_LIMIT + 1 })
      .success,
    false,
  );
  assert.equal(
    CommunityValidation.listQuery.safeParse({ page: "01" }).success,
    false,
  );
});

test("Community validation rejects unknown fields and empty updates", () => {
  assert.equal(
    CommunityValidation.create.safeParse({ name: "Community", slug: "manual" })
      .success,
    false,
  );
  assert.equal(CommunityValidation.update.safeParse({}).success, false);
});
