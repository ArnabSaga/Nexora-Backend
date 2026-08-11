import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityVisibility,
} from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import { CommunityMemberService } from "../../../../src/app/module/community-member/community-member.service";
import { CommunityService } from "../../../../src/app/module/community/community.service";
import { COMMUNITY_MAX_PAGE } from "../../../../src/app/module/community/community.constant";
import { buildReadableCommunityWhere } from "../../../../src/app/shared/policies/community.policy";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestCommunityMember } from "../../../support/fixtures/community-member.fixture";
import { createTestCommunityWithOwnerMembership } from "../../../support/fixtures/community.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId)
  throw new Error("TEST_RUN_ID is required; use the integration runner");

const runId = `${testRunId}-community-member-service`;
const cleanup = createTestCleanup();
type TUser = Awaited<ReturnType<typeof createTestUser>>;
const actor = (user: TUser): Express.AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role: user.role,
  status: user.status,
});

after(async () => {
  try {
    await cleanup.run();
  } finally {
    await prisma.$disconnect();
  }
});

test("Join lifecycle promotes stale PENDING membership without creating another row", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "join-owner" });
  const requester = await createTestUser({
    cleanup,
    runId,
    label: "join-requester",
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "join-community",
    visibility: CommunityVisibility.RESTRICTED,
  });

  const pending = await CommunityMemberService.joinCommunity(
    community.id,
    actor(requester),
  );
  assert.equal(pending.statusCode, 202);
  assert.equal(pending.data.status, CommunityMemberStatus.PENDING);

  await CommunityService.updateCommunity(community.id, actor(owner), {
    visibility: CommunityVisibility.PUBLIC,
  });
  const active = await CommunityMemberService.joinCommunity(
    community.id,
    actor(requester),
  );
  const rows = await prisma.communityMember.findMany({
    where: { communityId: community.id, userId: requester.id },
  });

  assert.equal(active.statusCode, 200);
  assert.equal(active.data.id, pending.data.id);
  assert.equal(active.data.status, CommunityMemberStatus.ACTIVE);
  assert.equal(rows.length, 1);
});

test("Private join uses availability while normal metadata stays hidden", async () => {
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "private-owner",
  });
  const outsider = await createTestUser({
    cleanup,
    runId,
    label: "private-outsider",
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "private-community",
    visibility: CommunityVisibility.PRIVATE,
  });

  await assert.rejects(
    CommunityService.getCommunityBySlug(community.slug, actor(outsider)),
  );
  const request = await CommunityMemberService.joinCommunity(
    community.id,
    actor(outsider),
  );
  assert.equal(request.statusCode, 202);
  assert.equal(request.data.status, CommunityMemberStatus.PENDING);
  await assert.rejects(
    CommunityService.getCommunityBySlug(community.slug, actor(outsider)),
  );
});

test("Public roster and membersCount exclude suspended and soft-deleted users", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "roster-owner" });
  const active = await createTestUser({
    cleanup,
    runId,
    label: "roster-active",
  });
  const suspended = await createTestUser({
    cleanup,
    runId,
    label: "roster-suspended",
    status: "SUSPENDED",
  });
  const deleted = await createTestUser({
    cleanup,
    runId,
    label: "roster-deleted",
    deletedAt: new Date(),
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "roster-community",
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: active.id,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: suspended.id,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: deleted.id,
  });

  const detail = await CommunityService.getCommunityBySlug(community.slug);
  const roster = await CommunityMemberService.getCommunityMembers(
    community.id,
    {},
  );

  assert.equal(detail.membersCount, 2);
  assert.deepEqual(
    new Set(roster.data.map((member) => member.user.id)),
    new Set([owner.id, active.id]),
  );
  assert.equal(roster.meta.total, detail.membersCount);
});

test("Member hierarchy, banned preservation, and stale-state leave remain distinct", async () => {
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "hierarchy-owner",
  });
  const admin = await createTestUser({
    cleanup,
    runId,
    label: "hierarchy-admin",
  });
  const moderator = await createTestUser({
    cleanup,
    runId,
    label: "hierarchy-moderator",
  });
  const member = await createTestUser({
    cleanup,
    runId,
    label: "hierarchy-member",
  });
  const bannedAdmin = await createTestUser({
    cleanup,
    runId,
    label: "hierarchy-banned-admin",
  });
  const bannedMember = await createTestUser({
    cleanup,
    runId,
    label: "hierarchy-banned-member",
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "hierarchy-community",
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: admin.id,
    role: CommunityMemberRole.ADMIN,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: moderator.id,
    role: CommunityMemberRole.MODERATOR,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: member.id,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: bannedAdmin.id,
    role: CommunityMemberRole.ADMIN,
    status: CommunityMemberStatus.BANNED,
  });
  const banned = await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: bannedMember.id,
    status: CommunityMemberStatus.BANNED,
  });

  await assert.rejects(
    CommunityMemberService.updateMemberStatus(
      community.id,
      bannedAdmin.id,
      actor(admin),
      { status: CommunityMemberStatus.ACTIVE },
    ),
  );
  await CommunityMemberService.removeCommunityMember(
    community.id,
    member.id,
    actor(moderator),
  );
  await assert.rejects(
    CommunityMemberService.removeCommunityMember(
      community.id,
      bannedMember.id,
      actor(owner),
    ),
  );

  await prisma.community.update({
    where: { id: community.id },
    data: { isSuspended: true },
  });
  await CommunityMemberService.leaveCommunity(community.id, actor(moderator));
  await CommunityMemberService.leaveCommunity(
    community.id,
    actor(bannedMember),
  );
  const [moderatorRow, bannedRow] = await Promise.all([
    prisma.communityMember.findUnique({
      where: {
        communityId_userId: { communityId: community.id, userId: moderator.id },
      },
    }),
    prisma.communityMember.findUnique({ where: { id: banned.id } }),
  ]);
  assert.equal(moderatorRow, null);
  assert.equal(bannedRow?.status, CommunityMemberStatus.BANNED);
});

test("Concurrent Community joins and stale promotions converge on one membership", async () => {
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "concurrent-owner",
  });
  const joining = await createTestUser({
    cleanup,
    runId,
    label: "concurrent-joining",
  });
  const promoting = await createTestUser({
    cleanup,
    runId,
    label: "concurrent-promoting",
  });
  const publicCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "concurrent-public",
  });

  const joined = await Promise.all([
    CommunityMemberService.joinCommunity(publicCommunity.id, actor(joining)),
    CommunityMemberService.joinCommunity(publicCommunity.id, actor(joining)),
  ]);
  const joinedRows = await prisma.communityMember.findMany({
    where: { communityId: publicCommunity.id, userId: joining.id },
  });
  assert.equal(joinedRows.length, 1);
  assert.ok(joined.every((result) => result.data.id === joinedRows[0].id));
  assert.ok(
    joined.every(
      (result) => result.data.status === CommunityMemberStatus.ACTIVE,
    ),
  );

  const restrictedCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "concurrent-restricted",
    visibility: CommunityVisibility.RESTRICTED,
  });
  const pending = await CommunityMemberService.joinCommunity(
    restrictedCommunity.id,
    actor(promoting),
  );
  await prisma.community.update({
    where: { id: restrictedCommunity.id },
    data: { visibility: CommunityVisibility.PUBLIC },
  });
  const promoted = await Promise.all([
    CommunityMemberService.joinCommunity(
      restrictedCommunity.id,
      actor(promoting),
    ),
    CommunityMemberService.joinCommunity(
      restrictedCommunity.id,
      actor(promoting),
    ),
  ]);
  const promotedRows = await prisma.communityMember.findMany({
    where: { communityId: restrictedCommunity.id, userId: promoting.id },
  });
  assert.equal(promotedRows.length, 1);
  assert.equal(promotedRows[0].id, pending.data.id);
  assert.equal(promotedRows[0].status, CommunityMemberStatus.ACTIVE);
  assert.ok(promoted.every((result) => result.data.id === pending.data.id));
});

test("Community management hierarchy protects ADMIN peers and pending requests", async () => {
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "complete-hierarchy-owner",
  });
  const admin = await createTestUser({
    cleanup,
    runId,
    label: "complete-hierarchy-admin",
  });
  const adminPeer = await createTestUser({
    cleanup,
    runId,
    label: "complete-hierarchy-admin-peer",
  });
  const moderator = await createTestUser({
    cleanup,
    runId,
    label: "complete-hierarchy-moderator",
  });
  const pending = await createTestUser({
    cleanup,
    runId,
    label: "complete-hierarchy-pending",
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "complete-hierarchy-community",
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: admin.id,
    role: CommunityMemberRole.ADMIN,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: adminPeer.id,
    role: CommunityMemberRole.ADMIN,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: moderator.id,
    role: CommunityMemberRole.MODERATOR,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: pending.id,
    status: CommunityMemberStatus.PENDING,
  });

  await assert.rejects(
    CommunityMemberService.updateMemberStatus(
      community.id,
      adminPeer.id,
      actor(admin),
      { status: CommunityMemberStatus.BANNED },
    ),
  );
  await assert.rejects(
    CommunityMemberService.updateMemberRole(
      community.id,
      moderator.id,
      actor(admin),
      { role: CommunityMemberRole.ADMIN },
    ),
  );
  await assert.rejects(
    CommunityMemberService.removeCommunityMember(
      community.id,
      pending.id,
      actor(moderator),
    ),
  );
  await CommunityMemberService.updateMemberStatus(
    community.id,
    moderator.id,
    actor(admin),
    { status: CommunityMemberStatus.BANNED },
  );
  await CommunityMemberService.updateMemberStatus(
    community.id,
    moderator.id,
    actor(admin),
    { status: CommunityMemberStatus.ACTIVE },
  );
  await CommunityMemberService.updateMemberRole(
    community.id,
    moderator.id,
    actor(owner),
    { role: CommunityMemberRole.ADMIN },
  );
});

test("Community Member pagination is bounded and ordered by joinedAt", async () => {
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "ordering-owner",
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "member-ordering",
  });
  const users = await Promise.all(
    ["oldest", "middle", "newest"].map((label) =>
      createTestUser({ cleanup, runId, label: `member-ordering-${label}` }),
    ),
  );
  const maximum = await prisma.communityMember.aggregate({
    where: { communityId: community.id },
    _max: { joinedAt: true },
  });
  const baseTime = maximum._max.joinedAt?.getTime() ?? Date.now();

  for (let index = 0; index < users.length; index += 1) {
    await createTestCommunityMember({
      cleanup,
      communityId: community.id,
      userId: users[index].id,
      joinedAt: new Date(baseTime + (index + 1) * 1_000),
    });
  }

  const [first, second, maximumPage] = await Promise.all([
    CommunityMemberService.getCommunityMembers(community.id, {
      page: 1,
      limit: 2,
    }),
    CommunityMemberService.getCommunityMembers(community.id, {
      page: 2,
      limit: 2,
    }),
    CommunityMemberService.getCommunityMembers(community.id, {
      page: COMMUNITY_MAX_PAGE,
      limit: 1,
    }),
  ]);

  assert.deepEqual(
    first.data.map((member) => member.user.id),
    [users[2].id, users[1].id],
  );
  assert.equal(second.data[0].user.id, users[0].id);
  assert.equal(first.meta.total, 4);
  assert.equal(first.meta.totalPages, 2);
  assert.equal(maximumPage.meta.page, COMMUNITY_MAX_PAGE);
  await assert.rejects(
    CommunityMemberService.getCommunityMembers(community.id, {
      page: COMMUNITY_MAX_PAGE + 1,
    }),
  );
});
