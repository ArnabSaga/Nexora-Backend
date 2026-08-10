import type { VoteType } from "../../../generated/prisma/client";

export type TVotePayload = {
  voteType: VoteType;
};

export type TVoteReadState = {
  votesCount: number;
  voteScore: number;
  viewerVote: VoteType | null;
};

type TVoteResponseBase = {
  id: string;
  voteType: VoteType;
  createdAt: Date;
  viewerState: {
    vote: VoteType | null;
  };
};

export type TPostVoteResponse = TVoteResponseBase & {
  counts: {
    votesCount: number;
    voteScore: number;
  };
};

export type TCommentVoteResponse = TVoteResponseBase & {
  counts: {
    votes: number;
    voteScore: number;
  };
};
