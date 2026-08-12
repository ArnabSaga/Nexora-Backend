import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import {
  buildCommunityModerationWhere,
  buildReadableCommunityWhere,
} from "../../shared/policies/community.policy";
import {
  COMMUNITY_RULE_MAX_COUNT,
  COMMUNITY_RULE_TRANSACTION_MAX_ATTEMPTS,
} from "./community-rule.constant";
import type {
  TCommunityRuleResponse,
  TCreateCommunityRulePayload,
  TUpdateCommunityRulePayload,
} from "./community-rule.interface";
import {
  COMMUNITY_RULE_SELECT,
  type TCommunityRulePayload,
} from "./community-rule.select";
import { createCommunityRuleUpdateService } from "./community-rule-update.factory";

const mapCommunityRule = (
  rule: TCommunityRulePayload,
): TCommunityRuleResponse => ({
  id: rule.id,
  communityId: rule.communityId,
  title: rule.title,
  description: rule.description,
  orderNo: rule.orderNo,
  createdAt: rule.createdAt,
  updatedAt: rule.updatedAt,
});

const isPrismaErrorCode = (error: unknown, code: string) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

const createCommunityRule = async (
  communityId: string,
  requester: Express.AuthenticatedUser,
  payload: TCreateCommunityRulePayload,
) => {
  for (
    let attempt = 1;
    attempt <= COMMUNITY_RULE_TRANSACTION_MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const rule = await prisma.$transaction(
        async (tx) => {
          const community = await tx.community.findFirst({
            where: {
              id: communityId,
              ...buildCommunityModerationWhere(requester.id),
            },
            select: { id: true },
          });

          if (!community) {
            throw new AppError(status.NOT_FOUND, "Community not found");
          }

          const ruleCount = await tx.communityRule.count({
            where: { communityId },
          });

          if (ruleCount >= COMMUNITY_RULE_MAX_COUNT) {
            throw new AppError(status.CONFLICT, "Community rule limit reached");
          }

          return tx.communityRule.create({
            data: {
              communityId,
              title: payload.title,
              description: payload.description ?? null,
              orderNo: payload.orderNo,
            },
            select: COMMUNITY_RULE_SELECT,
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return mapCommunityRule(rule);
    } catch (error) {
      if (!isPrismaErrorCode(error, "P2034")) {
        throw error;
      }

      if (attempt === COMMUNITY_RULE_TRANSACTION_MAX_ATTEMPTS) {
        throw new AppError(
          status.CONFLICT,
          "Community rule creation conflicted. Please retry.",
        );
      }
    }
  }

  throw new AppError(
    status.CONFLICT,
    "Community rule creation conflicted. Please retry.",
  );
};

const getCommunityRules = async (
  communityId: string,
  viewer?: Express.AuthenticatedUser,
) => {
  const community = await prisma.community.findFirst({
    where: {
      id: communityId,
      ...buildReadableCommunityWhere(viewer),
    },
    select: { id: true },
  });

  if (!community) {
    throw new AppError(status.NOT_FOUND, "Community not found");
  }

  const rules = await prisma.communityRule.findMany({
    where: { communityId },
    take: COMMUNITY_RULE_MAX_COUNT,
    orderBy: [{ orderNo: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: COMMUNITY_RULE_SELECT,
  });

  return rules.map(mapCommunityRule);
};

const findManagedRule = async (ruleId: string, requesterId: string) => {
  const rule = await prisma.communityRule.findFirst({
    where: {
      id: ruleId,
      community: {
        is: buildCommunityModerationWhere(requesterId),
      },
    },
    select: { id: true },
  });

  if (!rule) {
    throw new AppError(status.NOT_FOUND, "Community rule not found");
  }

  return rule;
};

const CommunityRuleUpdateService = createCommunityRuleUpdateService({
  authorizeRule: findManagedRule,
  updateRule: (ruleId, payload) =>
    prisma.communityRule.update({
      where: { id: ruleId },
      data: {
        ...(payload.title !== undefined && { title: payload.title }),
        ...(payload.description !== undefined && {
          description: payload.description,
        }),
        ...(payload.orderNo !== undefined && { orderNo: payload.orderNo }),
      },
      select: COMMUNITY_RULE_SELECT,
    }),
});

const updateCommunityRule = async (
  ruleId: string,
  requester: Express.AuthenticatedUser,
  payload: TUpdateCommunityRulePayload,
) => {
  const updated = await CommunityRuleUpdateService.updateCommunityRule(
    ruleId,
    requester.id,
    payload,
  );

  return mapCommunityRule(updated);
};

const deleteCommunityRule = async (
  ruleId: string,
  requester: Express.AuthenticatedUser,
) => {
  const rule = await findManagedRule(ruleId, requester.id);

  await prisma.communityRule.deleteMany({
    where: { id: rule.id },
  });

  return null;
};

export const CommunityRuleService = {
  createCommunityRule,
  getCommunityRules,
  updateCommunityRule,
  deleteCommunityRule,
};
