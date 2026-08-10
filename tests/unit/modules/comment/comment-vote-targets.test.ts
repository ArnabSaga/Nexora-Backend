import assert from "node:assert/strict";
import test from "node:test";
import type { TCommentResponse } from "../../../../src/app/module/comment/comment.interface";
import { collectCommentVoteTargetIds } from "../../../../src/app/module/comment/comment.utils";

test("Comment Vote targets combine top-level Comments and direct replies", () => {
  const comments = [
    {
      id: "comment-a",
      replies: [{ id: "reply-a" }, { id: "shared" }],
    },
    {
      id: "shared",
      replies: [{ id: "reply-b" }],
    },
  ] as TCommentResponse[];

  assert.deepEqual(collectCommentVoteTargetIds(comments), [
    "comment-a",
    "reply-a",
    "shared",
    "reply-b",
  ]);
});
