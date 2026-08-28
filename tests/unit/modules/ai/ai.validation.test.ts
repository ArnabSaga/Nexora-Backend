import assert from "node:assert/strict";
import test from "node:test";
import { PostType } from "../../../../src/generated/prisma/client";
import { AiValidation } from "../../../../src/app/module/ai/ai.validation";

test("AI validation applies canonical defaults", () => {
  assert.deepEqual(AiValidation.improvePost.parse({ content: " draft " }), {
    content: "draft",
    action: "IMPROVE",
    tone: "NEUTRAL",
  });
  assert.deepEqual(AiValidation.generatePost.parse({ topic: " topic " }), {
    topic: "topic",
    postType: PostType.SHORT,
    tone: "NEUTRAL",
  });
  assert.deepEqual(AiValidation.generateHashtags.parse({ content: "post" }), {
    content: "post",
    limit: 5,
  });
});

test("AI validation rejects unknown fields and duplicate normalized key points", () => {
  assert.throws(() =>
    AiValidation.improvePost.parse({ content: "draft", userId: "secret" }),
  );
  assert.throws(() =>
    AiValidation.generatePost.parse({
      topic: "topic",
      keyPoints: [" First ", "first"],
    }),
  );
});

test("AI validation aligns Profile drafts with destination limits", () => {
  assert.equal(
    AiValidation.improveProfile.parse({ field: "HEADLINE", content: " title " })
      .content,
    "title",
  );
  assert.throws(() =>
    AiValidation.improveProfile.parse({
      field: "HEADLINE",
      content: "x".repeat(161),
    }),
  );
  assert.throws(() =>
    AiValidation.improveProfile.parse({ field: "BIO", content: " " }),
  );
});
