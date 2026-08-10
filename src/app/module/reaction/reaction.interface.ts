import type { ReactionType } from "../../../generated/prisma/client";

export type TReactionPayload = {
  reactionType: ReactionType;
};

export type TReactionResponse = {
  id: string;
  reactionType: ReactionType;
  createdAt: Date;
};
