import status from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import AppError from "../../shared/errors/AppError";
import type { TUpdateCommunityRulePayload } from "./community-rule.interface";
import type { TCommunityRulePayload } from "./community-rule.select";

type TAuthorizedCommunityRule = {
  id: string;
};

type TCommunityRuleUpdateDependencies = {
  authorizeRule: (
    ruleId: string,
    requesterId: string,
  ) => Promise<TAuthorizedCommunityRule>;
  updateRule: (
    ruleId: string,
    payload: TUpdateCommunityRulePayload,
  ) => Promise<TCommunityRulePayload>;
};

export const createCommunityRuleUpdateService = ({
  authorizeRule,
  updateRule,
}: TCommunityRuleUpdateDependencies) => {
  const updateCommunityRule = async (
    ruleId: string,
    requesterId: string,
    payload: TUpdateCommunityRulePayload,
  ) => {
    const rule = await authorizeRule(ruleId, requesterId);

    try {
      return await updateRule(rule.id, payload);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new AppError(status.NOT_FOUND, "Community rule not found");
      }

      throw error;
    }
  };

  return { updateCommunityRule };
};

export type TCommunityRuleUpdateService = ReturnType<
  typeof createCommunityRuleUpdateService
>;
