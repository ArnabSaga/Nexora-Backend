import { VoteType } from "../../../generated/prisma/client";

export const ALLOWED_VOTE_TYPES = [
  VoteType.UPVOTE,
  VoteType.DOWNVOTE,
] as const;

export const VOTE_RESPONSE_SELECT = {
  id: true,
  voteType: true,
  createdAt: true,
} as const;
