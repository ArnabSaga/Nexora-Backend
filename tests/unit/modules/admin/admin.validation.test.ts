import assert from "node:assert/strict";
import test from "node:test";
import { PostVisibility } from "../../../../src/generated/prisma/client";
import { AdminValidation } from "../../../../src/app/module/admin/admin.validation";
import {
  normalizeAdminCommunityQuery,
  normalizeAdminCommunityId,
  normalizeAdminCommunityStatus,
  normalizeAdminPostQuery,
} from "../../../../src/app/module/admin/admin.util";

test("Admin HTTP validation accepts strict inventory and status contracts", () => {
  assert.deepEqual(
    AdminValidation.postList.parse({
      page: "2",
      limit: "50",
      searchTerm: " 100% ",
      visibility: PostVisibility.PRIVATE,
      state: "DELETED",
    }),
    {
      page: 2,
      limit: 50,
      searchTerm: "100%",
      visibility: PostVisibility.PRIVATE,
      state: "DELETED",
    },
  );
  assert.deepEqual(
    AdminValidation.communityStatus.parse({ status: "ACTIVE" }),
    {
      status: "ACTIVE",
    },
  );
});

test("Admin HTTP validation rejects unsafe queries and mutation bodies", () => {
  for (const value of [
    { page: "01" },
    { page: "1.0" },
    { limit: ["1", "2"] },
    { searchTerm: "a" },
    { unknown: true },
    { authorId: "not-a-cuid" },
  ]) {
    assert.equal(AdminValidation.postList.safeParse(value).success, false);
  }
  assert.equal(
    AdminValidation.communityStatus.safeParse({ status: "DELETED" }).success,
    false,
  );
  assert.equal(
    AdminValidation.communityStatus.safeParse({ status: "ACTIVE", extra: 1 })
      .success,
    false,
  );
});

test("Admin service validation applies defaults, literal escaping, and semantic bounds", () => {
  assert.deepEqual(normalizeAdminPostQuery({ searchTerm: " 100%_\\ " }), {
    page: 1,
    limit: 20,
    searchTerm: "100%_\\",
    patternSearchTerm: "100\\%\\_\\\\",
  });
  assert.deepEqual(normalizeAdminCommunityQuery({ state: "SUSPENDED" }), {
    page: 1,
    limit: 20,
    state: "SUSPENDED",
  });

  for (const value of [
    null,
    [],
    { page: "1" },
    { page: 0 },
    { limit: 51 },
    { searchTerm: " " },
    { state: "UNKNOWN" },
    { extra: true },
  ]) {
    assert.throws(() => normalizeAdminPostQuery(value));
  }

  assert.equal(normalizeAdminCommunityStatus("SUSPENDED"), "SUSPENDED");
  assert.equal(normalizeAdminCommunityId("c123456"), "c123456");
  assert.throws(() => normalizeAdminCommunityStatus("DELETED"));
  assert.throws(() => normalizeAdminCommunityStatus(undefined));
  assert.throws(() => normalizeAdminCommunityId("not-a-cuid"));
});
