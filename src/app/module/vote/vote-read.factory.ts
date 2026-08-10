import { VoteType } from "../../../generated/prisma/client";
import type { TVoteReadState } from "./vote.interface";

type TPostVoteAggregate = {
  postId: string;
  voteType: VoteType;
  _count: {
    _all: number;
  };
};

type TCommentVoteAggregate = {
  commentId: string;
  voteType: VoteType;
  _count: {
    _all: number;
  };
};

type TVoteReadClient = {
  getPostAggregates: (postIds: string[]) => Promise<TPostVoteAggregate[]>;
  getViewerPostVotes: (
    postIds: string[],
    viewerId: string,
  ) => Promise<Array<{ postId: string; voteType: VoteType }>>;
  getCommentAggregates: (
    commentIds: string[],
  ) => Promise<TCommentVoteAggregate[]>;
  getViewerCommentVotes: (
    commentIds: string[],
    viewerId: string,
  ) => Promise<Array<{ commentId: string; voteType: VoteType }>>;
};

const initializeStates = (ids: string[]) => {
  return new Map<string, TVoteReadState>(
    ids.map((id) => [
      id,
      {
        votesCount: 0,
        voteScore: 0,
        viewerVote: null,
      },
    ]),
  );
};

const applyAggregate = (
  state: TVoteReadState,
  voteType: VoteType,
  count: number,
) => {
  state.votesCount += count;
  state.voteScore += voteType === VoteType.UPVOTE ? count : -count;
};

export const createVoteReadService = (client: TVoteReadClient) => {
  const getPostVoteStates = async (
    postIds: string[],
    viewerId?: string,
  ): Promise<Map<string, TVoteReadState>> => {
    const ids = [...new Set(postIds)];

    if (!ids.length) {
      return new Map();
    }

    const states = initializeStates(ids);
    const [aggregates, viewerVotes] = await Promise.all([
      client.getPostAggregates(ids),
      viewerId ? client.getViewerPostVotes(ids, viewerId) : Promise.resolve([]),
    ]);

    for (const aggregate of aggregates) {
      const state = states.get(aggregate.postId);

      if (state) {
        applyAggregate(state, aggregate.voteType, aggregate._count._all);
      }
    }

    for (const vote of viewerVotes) {
      const state = states.get(vote.postId);

      if (state) {
        state.viewerVote = vote.voteType;
      }
    }

    return states;
  };

  const getCommentVoteStates = async (
    commentIds: string[],
    viewerId?: string,
  ): Promise<Map<string, TVoteReadState>> => {
    const ids = [...new Set(commentIds)];

    if (!ids.length) {
      return new Map();
    }

    const states = initializeStates(ids);
    const [aggregates, viewerVotes] = await Promise.all([
      client.getCommentAggregates(ids),
      viewerId
        ? client.getViewerCommentVotes(ids, viewerId)
        : Promise.resolve([]),
    ]);

    for (const aggregate of aggregates) {
      const state = states.get(aggregate.commentId);

      if (state) {
        applyAggregate(state, aggregate.voteType, aggregate._count._all);
      }
    }

    for (const vote of viewerVotes) {
      const state = states.get(vote.commentId);

      if (state) {
        state.viewerVote = vote.voteType;
      }
    }

    return states;
  };

  return {
    getPostVoteStates,
    getCommentVoteStates,
  };
};

export type TVoteReadService = ReturnType<typeof createVoteReadService>;
