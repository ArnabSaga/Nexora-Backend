import assert from "node:assert/strict";
import test from "node:test";
import { VoteValidation } from "../../../../src/app/module/vote/vote.validation";

const validCuid = "ck1234567890123456789012";

test("Vote validation accepts strict CUIDs and supported vote types", () => {
  assert.equal(
    VoteValidation.postVote.params.safeParse({ postId: validCuid }).success,
    true,
  );
  assert.equal(
    VoteValidation.commentVote.body.safeParse({ voteType: "UPVOTE" }).success,
    true,
  );
  assert.equal(
    VoteValidation.commentVote.body.safeParse({ voteType: "DOWNVOTE" })
      .success,
    true,
  );
});

test("Vote validation rejects malformed and whitespace-normalized identifiers", () => {
  for (const postId of [
    "c1",
    "CINVALID",
    "550e8400-e29b-41d4-a716-446655440000",
    ` ${validCuid} `,
  ]) {
    assert.equal(
      VoteValidation.deletePostVote.params.safeParse({ postId }).success,
      false,
      `Expected ${JSON.stringify(postId)} to be rejected`,
    );
  }
});

test("Vote validation rejects unsupported types and unknown body fields", () => {
  assert.equal(
    VoteValidation.postVote.body.safeParse({ voteType: "NEUTRAL" }).success,
    false,
  );
  assert.equal(
    VoteValidation.postVote.body.safeParse({
      voteType: "UPVOTE",
      extra: true,
    }).success,
    false,
  );
});
