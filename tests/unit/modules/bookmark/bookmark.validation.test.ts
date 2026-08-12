import assert from "node:assert/strict";
import test from "node:test";
import { BookmarkValidation } from "../../../../src/app/module/bookmark/bookmark.validation";
import {
  decodeBookmarkCursor,
  encodeBookmarkCursor,
} from "../../../../src/app/module/bookmark/bookmark.cursor";
import AppError from "../../../../src/app/shared/errors/AppError";

const validId = "cm12345678901234567890123";
const createdAt = "2026-08-12T10:20:30.000Z";

test("Bookmark validation accepts strict IDs and list boundaries", () => {
  assert.equal(
    BookmarkValidation.postIdParam.safeParse({ postId: validId }).success,
    true,
  );
  assert.equal(
    BookmarkValidation.listQuery.safeParse({ limit: "1" }).success,
    true,
  );
  assert.equal(
    BookmarkValidation.listQuery.safeParse({ limit: "50" }).success,
    true,
  );
});

test("Bookmark validation rejects normalization, non-scalars, and unknown keys", () => {
  for (const input of [
    { postId: ` ${validId}` },
    { postId: `${validId} ` },
    { postId: "not-a-cuid" },
  ]) {
    assert.equal(
      BookmarkValidation.postIdParam.safeParse(input).success,
      false,
    );
  }

  for (const query of [
    { limit: "0" },
    { limit: "51" },
    { limit: "1.0" },
    { limit: ["1", "2"] },
    { cursor: ["abc", "def"] },
    { extra: "value" },
  ]) {
    assert.equal(BookmarkValidation.listQuery.safeParse(query).success, false);
  }
});

test("Bookmark cursor requires canonical base64url and an exact payload", () => {
  const cursor = encodeBookmarkCursor({ id: validId, createdAt });

  assert.deepEqual(decodeBookmarkCursor(cursor), {
    version: 1,
    id: validId,
    createdAt,
  });

  const invalidPayloads = [
    { version: 2, id: validId, createdAt },
    { version: 1, id: "invalid", createdAt },
    { version: 1, id: validId, createdAt: "2026-08-12" },
    { version: 1, id: validId, createdAt, extra: true },
  ];

  for (const payload of invalidPayloads) {
    const invalid = Buffer.from(JSON.stringify(payload)).toString("base64url");
    assert.throws(
      () => decodeBookmarkCursor(invalid),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
  }

  for (const invalid of ["not+base64", `${cursor}=`, "eyJ2ZXJzaW9uIjox"]) {
    assert.throws(
      () => decodeBookmarkCursor(invalid),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
  }
});
