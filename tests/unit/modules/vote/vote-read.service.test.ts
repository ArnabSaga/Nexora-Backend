import assert from "node:assert/strict";
import test from "node:test";
import { VoteType } from "../../../../src/generated/prisma/client";
import { createVoteReadService } from "../../../../src/app/module/vote/vote-read.factory";

const createFakeClient = () => {
  const calls = {
    postAggregates: [] as string[][],
    viewerPosts: [] as Array<{ ids: string[]; viewerId: string }>,
    commentAggregates: [] as string[][],
    viewerComments: [] as Array<{ ids: string[]; viewerId: string }>,
  };

  return {
    calls,
    client: {
      getPostAggregates: async (ids: string[]) => {
        calls.postAggregates.push(ids);
        return [
          {
            postId: ids[0],
            voteType: VoteType.UPVOTE,
            _count: { _all: 2 },
          },
          {
            postId: ids[0],
            voteType: VoteType.DOWNVOTE,
            _count: { _all: 1 },
          },
        ].filter((item) => item.postId !== undefined) as Array<{
          postId: string;
          voteType: VoteType;
          _count: { _all: number };
        }>;
      },
      getViewerPostVotes: async (ids: string[], viewerId: string) => {
        calls.viewerPosts.push({ ids, viewerId });
        return ids.length
          ? [{ postId: ids[0], voteType: VoteType.UPVOTE }]
          : [];
      },
      getCommentAggregates: async (ids: string[]) => {
        calls.commentAggregates.push(ids);
        return ids.length
          ? [
              {
                commentId: ids[0],
                voteType: VoteType.DOWNVOTE,
                _count: { _all: 3 },
              },
            ]
          : [];
      },
      getViewerCommentVotes: async (ids: string[], viewerId: string) => {
        calls.viewerComments.push({ ids, viewerId });
        return ids.length
          ? [{ commentId: ids[0], voteType: VoteType.DOWNVOTE }]
          : [];
      },
    },
  };
};

test("Vote read factory performs zero calls for empty target lists", async () => {
  const fake = createFakeClient();
  const service = createVoteReadService(fake.client);

  assert.equal((await service.getPostVoteStates([], "viewer")).size, 0);
  assert.equal((await service.getCommentVoteStates([], "viewer")).size, 0);
  assert.deepEqual(fake.calls, {
    postAggregates: [],
    viewerPosts: [],
    commentAggregates: [],
    viewerComments: [],
  });
});

test("Vote read factory deduplicates Post IDs and skips guest viewer queries", async () => {
  const fake = createFakeClient();
  const service = createVoteReadService(fake.client);
  const states = await service.getPostVoteStates([
    "post-a",
    "post-a",
    "post-b",
  ]);

  assert.deepEqual(fake.calls.postAggregates, [["post-a", "post-b"]]);
  assert.equal(fake.calls.viewerPosts.length, 0);
  assert.deepEqual(states.get("post-a"), {
    votesCount: 3,
    voteScore: 1,
    viewerVote: null,
  });
  assert.deepEqual(states.get("post-b"), {
    votesCount: 0,
    voteScore: 0,
    viewerVote: null,
  });
});

test("Vote read factory performs one aggregate and viewer query per target type", async () => {
  const fake = createFakeClient();
  const service = createVoteReadService(fake.client);

  const postStates = await service.getPostVoteStates(
    ["post-a", "post-a"],
    "viewer",
  );
  const commentStates = await service.getCommentVoteStates(
    ["comment-a", "comment-a", "comment-b"],
    "viewer",
  );

  assert.deepEqual(fake.calls.postAggregates, [["post-a"]]);
  assert.deepEqual(fake.calls.viewerPosts, [
    { ids: ["post-a"], viewerId: "viewer" },
  ]);
  assert.deepEqual(fake.calls.commentAggregates, [["comment-a", "comment-b"]]);
  assert.deepEqual(fake.calls.viewerComments, [
    { ids: ["comment-a", "comment-b"], viewerId: "viewer" },
  ]);
  assert.equal(postStates.get("post-a")?.viewerVote, VoteType.UPVOTE);
  assert.deepEqual(commentStates.get("comment-a"), {
    votesCount: 3,
    voteScore: -3,
    viewerVote: VoteType.DOWNVOTE,
  });
});
