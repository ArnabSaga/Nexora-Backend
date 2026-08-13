import assert from "node:assert/strict";
import test from "node:test";
import {
  extractHashtagNames,
  parseHashtagPathTag,
} from "../../../../src/app/shared/hashtags/hashtag.util";

test("Hashtag extraction recognizes boundaries and ignores embedded hashes", () => {
  assert.deepEqual(
    extractHashtagNames(
      "#NestJS (#TypeScript) hello#ignored abc_#ignored ##ignored #valid_tag",
    ),
    ["nestjs", "typescript", "valid_tag"],
  );
});

test("Hashtag extraction truncates before deduplicating", () => {
  const prefix = "a".repeat(50);
  assert.deepEqual(extractHashtagNames(`#${prefix}x #${prefix}y #OTHER`), [
    prefix,
    "other",
  ]);
});

test("Hashtag path parsing is strict and only normalizes case", () => {
  assert.equal(parseHashtagPathTag("TypeScript_5"), "typescript_5");
  for (const value of [
    "#typescript",
    " typescript",
    "typescript ",
    "typescript!",
    "a".repeat(51),
    "",
    ["typescript"],
  ]) {
    assert.equal(parseHashtagPathTag(value), null);
  }
});
