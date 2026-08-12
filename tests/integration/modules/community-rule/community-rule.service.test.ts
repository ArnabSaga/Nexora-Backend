import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityVisibility,
  UserRole,
} from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import { COMMUNITY_RULE_MAX_COUNT } from "../../../../src/app/module/community-rule/community-rule.constant";
import { CommunityRuleService } from "../../../../src/app/module/community-rule/community-rule.service";
import { createCommunityRuleUpdateService } from "../../../../src/app/module/community-rule/community-rule-update.factory";
import { COMMUNITY_RULE_SELECT } from "../../../../src/app/module/community-rule/community-rule.select";
import AppError from "../../../../src/app/shared/errors/AppError";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestCommunityMember } from "../../../support/fixtures/community-member.fixture";
import { createTestCommunityRule } from "../../../support/fixtures/community-rule.fixture";
import { createTestCommunityWithOwnerMembership } from "../../../support/fixtures/community.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId)
  throw new Error("TEST_RUN_ID is required; use the integration runner");

const runId = testRunId + "-community-rule-service";
const cleanup = createTestCleanup();
type TUser = Awaited<ReturnType<typeof createTestUser>>;
const actor = (user: TUser, role = user.role): Express.AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role,
  status: user.status,
});

const trackRule = (id: string) =>
  cleanup.add("community-rule-service:" + id, () =>
    prisma.communityRule.deleteMany({ where: { id } }),
  );

after(async () => {
  try {
    await cleanup.run();
  } finally {
    await prisma.$disconnect();
  }
});

test("Rule listing distinguishes readable empty Communities and orders priorities", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "read-owner" });
  const member = await createTestUser({ cleanup, runId, label: "read-member" });
  const publicCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "read-public",
  });
  const privateCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "read-private",
    visibility: CommunityVisibility.PRIVATE,
  });
  const restrictedCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "read-restricted",
    visibility: CommunityVisibility.RESTRICTED,
  });
  const emptyCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "read-empty",
  });
  await createTestCommunityMember({
    cleanup,
    communityId: privateCommunity.id,
    userId: member.id,
  });

  const baseTime = Date.now();
  const second = await createTestCommunityRule({
    cleanup,
    communityId: publicCommunity.id,
    title: "Second",
    orderNo: 10,
    createdAt: new Date(baseTime + 2_000),
  });
  const first = await createTestCommunityRule({
    cleanup,
    communityId: publicCommunity.id,
    title: "First",
    orderNo: 10,
    createdAt: new Date(baseTime + 1_000),
  });
  const priority = await createTestCommunityRule({
    cleanup,
    communityId: publicCommunity.id,
    title: "Priority",
    orderNo: 0,
    createdAt: new Date(baseTime + 3_000),
  });

  const [rules, empty, restrictedRules, privateRules] = await Promise.all([
    CommunityRuleService.getCommunityRules(publicCommunity.id),
    CommunityRuleService.getCommunityRules(emptyCommunity.id),
    CommunityRuleService.getCommunityRules(restrictedCommunity.id),
    CommunityRuleService.getCommunityRules(privateCommunity.id, actor(member)),
  ]);

  assert.deepEqual(
    rules.map((rule) => rule.id),
    [priority.id, first.id, second.id],
  );
  assert.deepEqual(empty, []);
  assert.deepEqual(restrictedRules, []);
  assert.deepEqual(privateRules, []);
  await assert.rejects(
    CommunityRuleService.getCommunityRules(privateCommunity.id),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
});

test("Only available same-Community OWNER, ADMIN, and MODERATOR manage rules", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "auth-owner" });
  const admin = await createTestUser({ cleanup, runId, label: "auth-admin" });
  const moderator = await createTestUser({
    cleanup,
    runId,
    label: "auth-moderator",
  });
  const member = await createTestUser({ cleanup, runId, label: "auth-member" });
  const pending = await createTestUser({
    cleanup,
    runId,
    label: "auth-pending",
  });
  const banned = await createTestUser({ cleanup, runId, label: "auth-banned" });
  const platformAdmin = await createTestUser({
    cleanup,
    runId,
    label: "auth-platform-admin",
  });
  const otherOwner = await createTestUser({
    cleanup,
    runId,
    label: "auth-other-owner",
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "auth-community",
  });
  const otherCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: otherOwner.id,
    label: "auth-other-community",
  });

  for (const membership of [
    { userId: admin.id, role: CommunityMemberRole.ADMIN },
    { userId: moderator.id, role: CommunityMemberRole.MODERATOR },
    { userId: member.id, role: CommunityMemberRole.MEMBER },
    {
      userId: pending.id,
      role: CommunityMemberRole.MODERATOR,
      status: CommunityMemberStatus.PENDING,
    },
    {
      userId: banned.id,
      role: CommunityMemberRole.ADMIN,
      status: CommunityMemberStatus.BANNED,
    },
  ]) {
    await createTestCommunityMember({
      cleanup,
      communityId: community.id,
      ...membership,
    });
  }
  await createTestCommunityMember({
    cleanup,
    communityId: otherCommunity.id,
    userId: moderator.id,
    role: CommunityMemberRole.MODERATOR,
  });

  const created = await CommunityRuleService.createCommunityRule(
    community.id,
    actor(owner),
    { title: "Owner rule", orderNo: 0 },
  );
  trackRule(created.id);
  const updated = await CommunityRuleService.updateCommunityRule(
    created.id,
    actor(admin),
    { description: null, orderNo: 10 },
  );
  assert.equal(updated.orderNo, 10);
  assert.equal(updated.description, null);

  const moderatorRule = await CommunityRuleService.createCommunityRule(
    community.id,
    actor(moderator),
    { title: "Moderator rule", orderNo: 20 },
  );
  trackRule(moderatorRule.id);
  await CommunityRuleService.deleteCommunityRule(
    moderatorRule.id,
    actor(moderator),
  );

  for (const requester of [
    actor(member),
    actor(pending),
    actor(banned),
    actor(platformAdmin, UserRole.ADMIN),
    actor(otherOwner),
  ]) {
    await assert.rejects(
      CommunityRuleService.updateCommunityRule(created.id, requester, {
        title: "Denied",
      }),
      (error: unknown) => error instanceof AppError && error.statusCode === 404,
    );
  }

  await prisma.community.update({
    where: { id: community.id },
    data: { isSuspended: true },
  });
  await assert.rejects(
    CommunityRuleService.updateCommunityRule(created.id, actor(owner), {
      title: "Unavailable",
    }),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );

  await prisma.community.update({
    where: { id: community.id },
    data: { isSuspended: false, deletedAt: new Date() },
  });
  await assert.rejects(
    CommunityRuleService.getCommunityRules(community.id, actor(owner)),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
  await assert.rejects(
    CommunityRuleService.deleteCommunityRule(created.id, actor(owner)),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
});

test("Serializable creation keeps the Community Rule count at fifty", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "cap-owner" });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "cap-community",
  });

  for (let index = 0; index < COMMUNITY_RULE_MAX_COUNT - 1; index += 1) {
    await createTestCommunityRule({
      cleanup,
      communityId: community.id,
      title: "Existing rule " + index,
      orderNo: index,
    });
  }

  const results = await Promise.allSettled([
    CommunityRuleService.createCommunityRule(community.id, actor(owner), {
      title: "Concurrent A",
      orderNo: 100,
    }),
    CommunityRuleService.createCommunityRule(community.id, actor(owner), {
      title: "Concurrent B",
      orderNo: 101,
    }),
  ]);
  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");

  fulfilled.forEach((result) => trackRule(result.value.id));
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok(
    rejected[0].reason instanceof AppError &&
      rejected[0].reason.statusCode === 409,
  );
  assert.equal(
    await prisma.communityRule.count({ where: { communityId: community.id } }),
    COMMUNITY_RULE_MAX_COUNT,
  );
  await assert.rejects(
    CommunityRuleService.createCommunityRule(community.id, actor(owner), {
      title: "Rule 51",
      orderNo: 102,
    }),
    (error: unknown) => error instanceof AppError && error.statusCode === 409,
  );
});

test("Rule update maps deterministic post-authorization Prisma P2025 to 404", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "race-owner" });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "race-community",
  });
  const rule = await createTestCommunityRule({
    cleanup,
    communityId: community.id,
    title: "Race rule",
  });

  const deterministicUpdateService = createCommunityRuleUpdateService({
    authorizeRule: async () => ({ id: rule.id }),
    updateRule: async (ruleId, payload) => {
      await prisma.communityRule.delete({ where: { id: ruleId } });

      return prisma.communityRule.update({
        where: { id: ruleId },
        data: {
          ...(payload.title !== undefined && { title: payload.title }),
          ...(payload.description !== undefined && {
            description: payload.description,
          }),
          ...(payload.orderNo !== undefined && { orderNo: payload.orderNo }),
        },
        select: COMMUNITY_RULE_SELECT,
      });
    },
  });

  await assert.rejects(
    deterministicUpdateService.updateCommunityRule(rule.id, owner.id, {
      title: "Impossible update",
    }),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 404 &&
      error.message === "Community rule not found",
  );
  assert.equal(
    await prisma.communityRule.findUnique({ where: { id: rule.id } }),
    null,
  );
});

test("Rule DELETE succeeds once and repeated DELETE returns 404", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "delete-owner" });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "delete-community",
  });
  const rule = await createTestCommunityRule({
    cleanup,
    communityId: community.id,
    title: "Delete rule",
  });

  assert.equal(
    await CommunityRuleService.deleteCommunityRule(rule.id, actor(owner)),
    null,
  );
  assert.equal(
    await prisma.communityRule.findUnique({ where: { id: rule.id } }),
    null,
  );
  await assert.rejects(
    CommunityRuleService.deleteCommunityRule(rule.id, actor(owner)),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
});
