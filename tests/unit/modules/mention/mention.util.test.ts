import assert from "node:assert/strict";
import test from "node:test";
import AppError from "../../../../src/app/shared/errors/AppError";
import { MentionService } from "../../../../src/app/module/mention";

const id = (suffix: string) => `cmention${suffix}`;

test("Mention normalization validates raw length before stable deduplication", () => {
  assert.deepEqual(MentionService.normalize([id("a"), id("b"), id("a")]), [
    id("a"),
    id("b"),
  ]);

  assert.throws(
    () => MentionService.normalize(Array.from({ length: 51 }, () => id("a"))),
    (error: unknown) => error instanceof AppError && error.statusCode === 400,
  );
});

test("Mention normalization rejects non-arrays and malformed IDs", () => {
  for (const value of [undefined, "cmention", ["invalid"], [1]]) {
    assert.throws(
      () => MentionService.normalize(value),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
  }
});
