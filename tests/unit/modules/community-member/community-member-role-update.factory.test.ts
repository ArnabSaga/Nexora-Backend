import assert from "node:assert/strict";
import test from "node:test";
import status from "http-status";
import {
  CommunityMemberRole,
  CommunityMemberStatus,
} from "../../../../src/generated/prisma/client";
import AppError from "../../../../src/app/shared/errors/AppError";
import { createCommunityMemberRoleUpdateService } from "../../../../src/app/module/community-member/community-member-role-update.factory";

const membership = (role: CommunityMemberRole) => ({
  id: "membership",
  role,
  status: CommunityMemberStatus.ACTIVE,
});

test("Community role update converges without a write or event", async () => {
  let swaps = 0;
  let events = 0;
  const service = createCommunityMemberRoleUpdateService({
    resolveManagementContext: async () => ({
      requesterRole: CommunityMemberRole.OWNER,
      targetMembership: membership(CommunityMemberRole.MODERATOR),
    }),
    compareAndSwapRole: async () => {
      swaps += 1;
      return true;
    },
    readMembership: async () => ({ role: CommunityMemberRole.MODERATOR }),
    writeRoleNotification: async () => {
      events += 1;
    },
  });

  const result = await service.updateMemberRole(CommunityMemberRole.MODERATOR);
  assert.equal(result.role, CommunityMemberRole.MODERATOR);
  assert.equal(swaps, 0);
  assert.equal(events, 0);
});

test("Community role update retries fresh state and emits one event", async () => {
  let resolutions = 0;
  let swaps = 0;
  let events = 0;
  const service = createCommunityMemberRoleUpdateService({
    resolveManagementContext: async () => {
      resolutions += 1;
      return {
        requesterRole: CommunityMemberRole.OWNER,
        targetMembership: membership(
          resolutions === 1
            ? CommunityMemberRole.MEMBER
            : CommunityMemberRole.MODERATOR,
        ),
      };
    },
    compareAndSwapRole: async () => {
      swaps += 1;
      return swaps === 2;
    },
    readMembership: async () => ({ role: CommunityMemberRole.ADMIN }),
    writeRoleNotification: async () => {
      events += 1;
    },
  });

  const result = await service.updateMemberRole(CommunityMemberRole.ADMIN);
  assert.equal(result.role, CommunityMemberRole.ADMIN);
  assert.equal(resolutions, 2);
  assert.equal(events, 1);
});

test("Community role update reauthorizes after a lost CAS", async () => {
  let resolutions = 0;
  const service = createCommunityMemberRoleUpdateService({
    resolveManagementContext: async () => {
      resolutions += 1;
      return {
        requesterRole:
          resolutions === 1
            ? CommunityMemberRole.OWNER
            : CommunityMemberRole.ADMIN,
        targetMembership: membership(
          resolutions === 1
            ? CommunityMemberRole.MEMBER
            : CommunityMemberRole.ADMIN,
        ),
      };
    },
    compareAndSwapRole: async () => false,
    readMembership: async () => ({ role: CommunityMemberRole.MODERATOR }),
    writeRoleNotification: async () => undefined,
  });

  await assert.rejects(
    service.updateMemberRole(CommunityMemberRole.MODERATOR),
    (error: unknown) =>
      error instanceof AppError && error.statusCode === status.NOT_FOUND,
  );
  assert.equal(resolutions, 2);
});

test("Community role update stops after three lost CAS attempts", async () => {
  let attempts = 0;
  const service = createCommunityMemberRoleUpdateService({
    resolveManagementContext: async () => ({
      requesterRole: CommunityMemberRole.OWNER,
      targetMembership: membership(CommunityMemberRole.MEMBER),
    }),
    compareAndSwapRole: async () => {
      attempts += 1;
      return false;
    },
    readMembership: async () => ({ role: CommunityMemberRole.MEMBER }),
    writeRoleNotification: async () => undefined,
  });

  await assert.rejects(
    service.updateMemberRole(CommunityMemberRole.MODERATOR),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === status.CONFLICT &&
      error.message === "Community member role changed concurrently",
  );
  assert.equal(attempts, 3);
});
