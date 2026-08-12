import assert from "node:assert/strict";
import test from "node:test";
import { createBookmarkSaveService } from "../../../../src/app/module/bookmark/bookmark-save.factory";
import AppError from "../../../../src/app/shared/errors/AppError";

const requester = {
  id: "viewer-id",
  name: "Viewer",
  email: "viewer@example.com",
  image: null,
  role: "USER",
  status: "ACTIVE",
} as const satisfies Express.AuthenticatedUser;

test("Bookmark save factory creates visible bookmarks", async () => {
  const calls: string[] = [];
  const service = createBookmarkSaveService({
    findVisiblePost: async (postId) => {
      calls.push(`find:${postId}`);
      return { id: postId };
    },
    createBookmark: async (userId, postId) => {
      calls.push(`create:${userId}:${postId}`);
    },
    isDuplicateBookmarkError: () => false,
  });

  const result = await service.saveBookmark("post-id", requester);

  assert.equal(result.statusCode, 201);
  assert.deepEqual(calls, ["find:post-id", "create:viewer-id:post-id"]);
});

test("Bookmark save factory rejects invisible Posts before create", async () => {
  let createCalls = 0;
  const service = createBookmarkSaveService({
    findVisiblePost: async () => null,
    createBookmark: async () => {
      createCalls += 1;
    },
    isDuplicateBookmarkError: () => false,
  });

  await assert.rejects(
    service.saveBookmark("post-id", requester),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
  assert.equal(createCalls, 0);
});

test("Bookmark save factory maps matching duplicate errors", async () => {
  const duplicateError = new Error("duplicate bookmark");
  const service = createBookmarkSaveService({
    findVisiblePost: async () => ({ id: "post-id" }),
    createBookmark: async () => {
      throw duplicateError;
    },
    isDuplicateBookmarkError: (error) => error === duplicateError,
  });

  const result = await service.saveBookmark("post-id", requester);

  assert.equal(result.statusCode, 200);
  assert.equal(result.message, "Post already bookmarked");
});

test("Bookmark save factory preserves unrelated error identity", async () => {
  const originalError = new Error("database unavailable");
  const service = createBookmarkSaveService({
    findVisiblePost: async () => ({ id: "post-id" }),
    createBookmark: async () => {
      throw originalError;
    },
    isDuplicateBookmarkError: () => false,
  });

  await assert.rejects(
    service.saveBookmark("post-id", requester),
    (error: unknown) => error === originalError,
  );
});
