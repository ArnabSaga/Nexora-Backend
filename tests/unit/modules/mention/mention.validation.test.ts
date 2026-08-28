import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { CommentValidation } from "../../../../src/app/module/comment/comment.validation";
import {
  MentionService,
  MentionValidation,
} from "../../../../src/app/module/mention";
import { PostValidation } from "../../../../src/app/module/post/post.validation";

const mentionedUserId = "cmentionvalidationuser";

test("Mention-only Post and Comment updates are valid while empty updates are rejected", () => {
  assert.equal(
    PostValidation.update.safeParse({ mentionedUserIds: [] }).success,
    true,
  );
  assert.equal(
    CommentValidation.updateBody.safeParse({
      mentionedUserIds: [mentionedUserId],
    }).success,
    true,
  );
  assert.equal(PostValidation.update.safeParse({}).success, false);
  assert.equal(CommentValidation.updateBody.safeParse({}).success, false);
});

test("Post multipart conversion preserves duplicate Mention IDs before normalization", () => {
  const parsed = PostValidation.create.parse({
    content: "Mention transport",
    mentionedUserIds: JSON.stringify([mentionedUserId, mentionedUserId]),
  });

  assert.deepEqual(parsed.mentionedUserIds, [mentionedUserId, mentionedUserId]);
});

test("Mention HTTP validation enforces the raw limit and strict ID values", () => {
  const rawDuplicates = Array.from({ length: 51 }, () => mentionedUserId);

  assert.equal(
    PostValidation.create.safeParse({
      content: "Too many",
      mentionedUserIds: JSON.stringify(rawDuplicates),
    }).success,
    false,
  );
  assert.equal(
    CommentValidation.createBody.safeParse({
      content: "Too many",
      mentionedUserIds: rawDuplicates,
    }).success,
    false,
  );

  for (const invalidId of [` ${mentionedUserId}`, `${mentionedUserId} `]) {
    assert.equal(
      PostValidation.update.safeParse({
        mentionedUserIds: [invalidId],
      }).success,
      false,
    );
    assert.equal(
      CommentValidation.updateBody.safeParse({
        mentionedUserIds: [invalidId],
      }).success,
      false,
    );
  }
});

test("Mention HTTP and service boundaries match the installed CUID contract", () => {
  const cases = [
    ["c12345", false],
    ["c123456", true],
    ["C123456", true],
    ["cABCDEF", false],
    ["cmissingmention", true],
    [" c123456", false],
    ["c123456 ", false],
  ] as const;

  for (const [value, valid] of cases) {
    const zodResult = z.cuid().safeParse(value).success;
    const mentionValidationResult =
      MentionValidation.mentionedUserIds.safeParse([value]).success;
    let serviceResult = true;

    try {
      MentionService.normalize([value]);
    } catch {
      serviceResult = false;
    }

    assert.equal(
      zodResult,
      valid,
      `z.cuid() parity for ${JSON.stringify(value)}`,
    );
    assert.equal(
      mentionValidationResult,
      valid,
      `MentionValidation parity for ${JSON.stringify(value)}`,
    );
    assert.equal(
      serviceResult,
      valid,
      `MentionService parity for ${JSON.stringify(value)}`,
    );
  }
});
