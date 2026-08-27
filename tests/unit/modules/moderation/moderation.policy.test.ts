import assert from "node:assert/strict";
import test from "node:test";
import status from "http-status";
import {
  CommunityMemberRole,
  CommunityMemberStatus,
  ReportStatus,
  UserRole,
  UserStatus,
} from "../../../../src/generated/prisma/client";
import {
  COMMUNITY_MODERATION_ROLES,
  PLATFORM_GLOBAL_CONTENT_MODERATION_ROLES,
  PLATFORM_REPORT_REVIEW_ROLES,
  assertCanReviewReports,
  buildCommunityModerationWhere,
  canReviewReports,
  hasGlobalContentModerationAuthority,
} from "../../../../src/app/module/moderation";
import { ReportService } from "../../../../src/app/module/report/report.service";
import { prisma } from "../../../../src/app/lib/prisma";
import AppError from "../../../../src/app/shared/errors/AppError";
import { AVAILABLE_COMMUNITY_WHERE } from "../../../../src/app/shared/policies/community.policy";

const unauthorized: Express.AuthenticatedUser = {
  id: "cm12345678901234567890123",
  name: "User",
  email: "user@example.com",
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
};

const isForbidden = (error: unknown) =>
  error instanceof AppError &&
  error.statusCode === status.FORBIDDEN &&
  error.message === "You are not allowed to access this resource";

test("Moderation platform role policies are deliberately independent", () => {
  assert.deepEqual(PLATFORM_REPORT_REVIEW_ROLES, [
    UserRole.MODERATOR,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ]);
  assert.deepEqual(PLATFORM_GLOBAL_CONTENT_MODERATION_ROLES, [
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ]);

  assert.equal(canReviewReports(UserRole.USER), false);
  assert.equal(canReviewReports(UserRole.MODERATOR), true);
  assert.equal(canReviewReports(UserRole.ADMIN), true);
  assert.equal(canReviewReports(UserRole.SUPER_ADMIN), true);

  assert.equal(hasGlobalContentModerationAuthority(UserRole.USER), false);
  assert.equal(hasGlobalContentModerationAuthority(UserRole.MODERATOR), false);
  assert.equal(hasGlobalContentModerationAuthority(UserRole.ADMIN), true);
  assert.equal(hasGlobalContentModerationAuthority(UserRole.SUPER_ADMIN), true);
});

test("Report review assertion has one exact authorization error contract", () => {
  assert.throws(() => assertCanReviewReports(unauthorized), isForbidden);
  for (const role of [
    UserRole.MODERATOR,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
  ]) {
    assert.doesNotThrow(() => assertCanReviewReports({ role }));
  }
});

test("Community moderation predicate owns availability, owner, and membership rules", () => {
  assert.deepEqual(COMMUNITY_MODERATION_ROLES, [
    CommunityMemberRole.OWNER,
    CommunityMemberRole.ADMIN,
    CommunityMemberRole.MODERATOR,
  ]);
  assert.deepEqual(buildCommunityModerationWhere(unauthorized.id), {
    AND: [
      AVAILABLE_COMMUNITY_WHERE,
      {
        OR: [
          { ownerId: unauthorized.id },
          {
            members: {
              some: {
                userId: unauthorized.id,
                status: CommunityMemberStatus.ACTIVE,
                role: { in: [...COMMUNITY_MODERATION_ROLES] },
              },
            },
          },
        ],
      },
    ],
  });
});

test("Every Report service review method authorizes before validation or Prisma", async () => {
  type TDelegateMethod = (...args: unknown[]) => Promise<unknown>;
  type TReportDelegate = Record<
    "findMany" | "findUnique" | "updateManyAndReturn",
    TDelegateMethod
  >;

  const delegates = [
    prisma.userReport,
    prisma.postReport,
    prisma.commentReport,
    prisma.communityReport,
  ] as unknown as TReportDelegate[];
  const originals = delegates.map((delegate) => ({
    delegate,
    findMany: delegate.findMany,
    findUnique: delegate.findUnique,
    updateManyAndReturn: delegate.updateManyAndReturn,
  }));
  let prismaCalls = 0;
  const unexpectedPrismaCall = async () => {
    prismaCalls += 1;
    throw new Error("Prisma must not be reached before Report authorization");
  };

  try {
    for (const delegate of delegates) {
      delegate.findMany = unexpectedPrismaCall;
      delegate.findUnique = unexpectedPrismaCall;
      delegate.updateManyAndReturn = unexpectedPrismaCall;
    }

    prismaCalls = 0;
    await assert.rejects(
      ReportService.getReports(unauthorized, { cursor: "not-a-cursor" }),
      isForbidden,
    );
    assert.equal(prismaCalls, 0);

    prismaCalls = 0;
    await assert.rejects(
      ReportService.getReportById(unauthorized, "missing-report"),
      isForbidden,
    );
    assert.equal(prismaCalls, 0);

    prismaCalls = 0;
    await assert.rejects(
      ReportService.updateReportStatus(
        unauthorized,
        "missing-report",
        ReportStatus.REVIEWED,
      ),
      isForbidden,
    );
    assert.equal(prismaCalls, 0);
  } finally {
    for (const original of originals) {
      original.delegate.findMany = original.findMany;
      original.delegate.findUnique = original.findUnique;
      original.delegate.updateManyAndReturn = original.updateManyAndReturn;
    }
  }
});
