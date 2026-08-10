import assert from "node:assert/strict";
import test from "node:test";
import { ReactionValidation } from "../../../../src/app/module/reaction/reaction.validation";

const validCuid = "ck1234567890123456789012";

test("Reaction validation accepts valid CUIDs and supported reactions", () => {
  assert.equal(
    ReactionValidation.postReaction.params.safeParse({ postId: validCuid })
      .success,
    true,
  );
  assert.equal(
    ReactionValidation.commentReaction.body.safeParse({ reactionType: "LIKE" })
      .success,
    true,
  );
});

test("Reaction validation rejects malformed and normalized identifiers", () => {
  for (const postId of [
    "c1",
    "CINVALID",
    "550e8400-e29b-41d4-a716-446655440000",
    ` ${validCuid} `,
  ]) {
    assert.equal(
      ReactionValidation.deletePostReaction.params.safeParse({ postId }).success,
      false,
      `Expected ${JSON.stringify(postId)} to be rejected`,
    );
  }
});

test("Reaction validation rejects unsupported types and unknown body fields", () => {
  assert.equal(
    ReactionValidation.postReaction.body.safeParse({ reactionType: "ANGRY" })
      .success,
    false,
  );
  assert.equal(
    ReactionValidation.postReaction.body.safeParse({
      reactionType: "LOVE",
      extra: true,
    }).success,
    false,
  );
});
