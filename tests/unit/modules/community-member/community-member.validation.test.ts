import assert from "node:assert/strict";
import test from "node:test";
import {
  CommunityMemberRole,
  CommunityMemberStatus,
} from "../../../../src/generated/prisma/client";
import {
  COMMUNITY_MAX_LIMIT,
  COMMUNITY_MAX_PAGE,
} from "../../../../src/app/module/community/community.constant";
import { CommunityMemberValidation } from "../../../../src/app/module/community-member/community-member.validation";

const validCuid = "ck1234567890123456789012";

test("Community Member validation accepts canonical payloads and boundaries", () => {
  assert.equal(
    CommunityMemberValidation.idParam.safeParse({ id: validCuid }).success,
    true,
  );
  assert.equal(
    CommunityMemberValidation.memberParam.safeParse({
      communityId: validCuid,
      userId: validCuid,
    }).success,
    true,
  );
  assert.deepEqual(
    CommunityMemberValidation.memberListQuery.parse({
      page: String(COMMUNITY_MAX_PAGE),
      limit: String(COMMUNITY_MAX_LIMIT),
      status: CommunityMemberStatus.PENDING,
    }),
    {
      page: COMMUNITY_MAX_PAGE,
      limit: COMMUNITY_MAX_LIMIT,
      status: CommunityMemberStatus.PENDING,
    },
  );
  assert.equal(
    CommunityMemberValidation.updateRole.safeParse({
      role: CommunityMemberRole.MODERATOR,
    }).success,
    true,
  );
  assert.equal(
    CommunityMemberValidation.updateStatus.safeParse({
      status: CommunityMemberStatus.BANNED,
    }).success,
    true,
  );
});

test("Community Member validation rejects malformed IDs and unsafe queries", () => {
  for (const id of [
    "c1",
    ` ${validCuid} `,
    "550e8400-e29b-41d4-a716-446655440000",
  ]) {
    assert.equal(
      CommunityMemberValidation.idParam.safeParse({ id }).success,
      false,
    );
  }
  assert.equal(
    CommunityMemberValidation.memberListQuery.safeParse({
      page: COMMUNITY_MAX_PAGE + 1,
    }).success,
    false,
  );
  assert.equal(
    CommunityMemberValidation.memberListQuery.safeParse({
      limit: COMMUNITY_MAX_LIMIT + 1,
    }).success,
    false,
  );
  assert.equal(
    CommunityMemberValidation.memberListQuery.safeParse({ page: "01" }).success,
    false,
  );
  assert.equal(
    CommunityMemberValidation.memberListQuery.safeParse({ extra: true })
      .success,
    false,
  );
});

test("Community Member validation rejects forbidden management states", () => {
  assert.equal(
    CommunityMemberValidation.updateRole.safeParse({
      role: CommunityMemberRole.OWNER,
    }).success,
    false,
  );
  assert.equal(
    CommunityMemberValidation.updateStatus.safeParse({
      status: CommunityMemberStatus.PENDING,
    }).success,
    false,
  );
});
