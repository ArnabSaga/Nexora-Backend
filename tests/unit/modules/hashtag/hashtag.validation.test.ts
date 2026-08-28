import assert from "node:assert/strict";
import test from "node:test";
import AppError from "../../../../src/app/shared/errors/AppError";
import {
  decodeHashtagCursor,
  encodeHashtagCursor,
} from "../../../../src/app/module/hashtag/hashtag.cursor";
import { HashtagValidation } from "../../../../src/app/module/hashtag/hashtag.validation";

const id = "cm12345678901234567890123";
const createdAt = "2026-08-13T10:20:30.000Z";

test("Hashtag validation accepts boundaries and lowercases valid path tags", () => {
  assert.deepEqual(HashtagValidation.tagParam.parse({ tag: "TypeScript_5" }), {
    tag: "typescript_5",
  });
  assert.equal(
    HashtagValidation.trendingQuery.safeParse({ limit: "1" }).success,
    true,
  );
  assert.equal(
    HashtagValidation.postListQuery.safeParse({ limit: "50" }).success,
    true,
  );
});

test("Hashtag validation rejects permissive tags and non-scalar queries", () => {
  for (const params of [
    { tag: "#tag" },
    { tag: " tag" },
    { tag: "tag!" },
    { tag: "a".repeat(51) },
  ])
    assert.equal(HashtagValidation.tagParam.safeParse(params).success, false);

  for (const query of [
    { limit: "0" },
    { limit: "51" },
    { limit: ["1", "2"] },
    { cursor: ["a", "b"] },
    { extra: "value" },
  ])
    assert.equal(
      HashtagValidation.postListQuery.safeParse(query).success,
      false,
    );
});

test("Hashtag cursor requires a canonical exact payload", () => {
  const cursor = encodeHashtagCursor({ id, createdAt });
  assert.deepEqual(decodeHashtagCursor(cursor), { version: 1, id, createdAt });

  for (const payload of [
    { version: 2, id, createdAt },
    { version: 1, id: "invalid", createdAt },
    { version: 1, id, createdAt: "2026-08-13" },
    { version: 1, id, createdAt, extra: true },
  ]) {
    const invalid = Buffer.from(JSON.stringify(payload)).toString("base64url");
    assert.throws(
      () => decodeHashtagCursor(invalid),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
  }
});
