import status from "http-status";
import AppError from "../../shared/errors/AppError";
import type { TInsertedMention, TMentionWriter } from "./mention.interface";
import { normalizeMentionedUserIds } from "./mention.util";

type TMentionTarget = "POST" | "COMMENT";

export type TMentionWriteDependencies = {
  findEligibleUserIds: (ids: string[]) => Promise<string[]>;
  findMentions: (
    target: TMentionTarget,
    targetId: string,
  ) => Promise<TInsertedMention[]>;
  clearMentions: (target: TMentionTarget, targetId: string) => Promise<void>;
  deleteMentions: (
    target: TMentionTarget,
    targetId: string,
    mentionedUserIds: string[],
  ) => Promise<void>;
  createMentions: (
    target: TMentionTarget,
    targetId: string,
    mentionedUserIds: string[],
  ) => Promise<TInsertedMention[]>;
};

export const createMentionWriter = (
  dependencies: TMentionWriteDependencies,
): TMentionWriter => {
  const validateUsers = async (ids: string[]) => {
    if (!ids.length) return;

    const users = await dependencies.findEligibleUserIds(ids);
    if (users.length !== ids.length) {
      throw new AppError(
        status.BAD_REQUEST,
        "One or more mentioned users are invalid",
      );
    }
  };

  const sync = async (
    target: TMentionTarget,
    targetId: string,
    rawIds: string[],
  ) => {
    const ids = normalizeMentionedUserIds(rawIds);

    if (!ids.length) {
      await dependencies.clearMentions(target, targetId);
      return [];
    }

    await validateUsers(ids);

    const existing = await dependencies.findMentions(target, targetId);
    const existingIds = new Set(existing.map((item) => item.mentionedUserId));
    const requestedIds = new Set(ids);
    const removedIds = [...existingIds].filter((id) => !requestedIds.has(id));
    const addedIds = ids.filter((id) => !existingIds.has(id));

    if (removedIds.length) {
      await dependencies.deleteMentions(target, targetId, removedIds);
    }

    if (!addedIds.length) return [];

    const inserted = await dependencies.createMentions(
      target,
      targetId,
      addedIds,
    );
    const insertedByUserId = new Map(
      inserted.map((item) => [item.mentionedUserId, item]),
    );

    return ids
      .map((id) => insertedByUserId.get(id))
      .filter((item): item is TInsertedMention => Boolean(item));
  };

  return {
    validateUsers,
    syncPost: (postId, ids) => sync("POST", postId, ids),
    syncComment: (commentId, ids) => sync("COMMENT", commentId, ids),
  };
};
