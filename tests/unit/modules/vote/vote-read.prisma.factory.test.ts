import assert from "node:assert/strict";
import test from "node:test";
import { VoteType } from "../../../../src/generated/prisma/client";
import {
  createPrismaVoteReadService,
  type TVoteReadPrismaClient,
} from "../../../../src/app/module/vote/vote-read.prisma.factory";

test("Prisma Vote adapter forwards grouped and viewer queries", async () => {
  const calls = {
    postGroup: [] as unknown[],
    postViewer: [] as unknown[],
    commentGroup: [] as unknown[],
    commentViewer: [] as unknown[],
  };
  const client = {
    postVote: {
      groupBy: async (args: unknown) => {
        calls.postGroup.push(args);
        return [
          {
            postId: "post-a",
            voteType: VoteType.UPVOTE,
            _count: { _all: 2 },
          },
        ];
      },
      findMany: async (args: unknown) => {
        calls.postViewer.push(args);
        return [{ postId: "post-a", voteType: VoteType.UPVOTE }];
      },
    },
    commentVote: {
      groupBy: async (args: unknown) => {
        calls.commentGroup.push(args);
        return [
          {
            commentId: "comment-a",
            voteType: VoteType.DOWNVOTE,
            _count: { _all: 1 },
          },
        ];
      },
      findMany: async (args: unknown) => {
        calls.commentViewer.push(args);
        return [{ commentId: "comment-a", voteType: VoteType.DOWNVOTE }];
      },
    },
  } as unknown as TVoteReadPrismaClient;
  const service = createPrismaVoteReadService(client);

  assert.deepEqual(
    await service.getPostVoteStates(["post-a"], "viewer-a"),
    new Map([
      [
        "post-a",
        { votesCount: 2, voteScore: 2, viewerVote: VoteType.UPVOTE },
      ],
    ]),
  );
  assert.deepEqual(
    await service.getCommentVoteStates(["comment-a"], "viewer-a"),
    new Map([
      [
        "comment-a",
        { votesCount: 1, voteScore: -1, viewerVote: VoteType.DOWNVOTE },
      ],
    ]),
  );
  assert.equal(calls.postGroup.length, 1);
  assert.equal(calls.postViewer.length, 1);
  assert.equal(calls.commentGroup.length, 1);
  assert.equal(calls.commentViewer.length, 1);
});
