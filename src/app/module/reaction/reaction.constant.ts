import { ReactionType } from "../../../generated/prisma/client";

export const ALLOWED_REACTION_TYPES = [
  ReactionType.LIKE,
  ReactionType.LOVE,
  ReactionType.INSIGHTFUL,
  ReactionType.CELEBRATE,
  ReactionType.FUNNY,
] as const;

export const REACTION_RESPONSE_SELECT = {
  id: true,
  reactionType: true,
  createdAt: true,
} as const;
