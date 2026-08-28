import assert from "node:assert/strict";
import test from "node:test";
import { createHashtagWriter } from "../../../../src/app/shared/hashtags/hashtag-write.factory";

test("Hashtag writer increments only relationships actually inserted", async () => {
  const increments: string[] = [];
  const writer = createHashtagWriter({
    getOrCreateHashtag: async (name) => ({ id: name }),
    findPostHashtags: async () => [],
    createPostHashtags: async (_postId, ids) => [{ hashtagId: ids[0] }],
    deletePostHashtag: async () => 0,
    incrementHashtag: async (id) => void increments.push(id),
    decrementHashtag: async () => undefined,
  });

  await writer.syncPostHashtags("post-1", "#first #second");
  assert.deepEqual(increments, ["first"]);
});

test("Hashtag writer decrements only relationships actually removed", async () => {
  const decrements: string[] = [];
  const writer = createHashtagWriter({
    getOrCreateHashtag: async (name) => ({ id: name }),
    findPostHashtags: async () => [
      { hashtagId: "removed" },
      { hashtagId: "already-gone" },
    ],
    createPostHashtags: async () => [],
    deletePostHashtag: async (_postId, id) => (id === "removed" ? 1 : 0),
    incrementHashtag: async () => undefined,
    decrementHashtag: async (id) => void decrements.push(id),
  });

  await writer.syncPostHashtags("post-1", "");
  assert.deepEqual(decrements, ["removed"]);
});

test("Hashtag soft-delete decrement keeps links and decrements each supplied link", async () => {
  let deleteCalls = 0;
  const decrements: string[] = [];
  const writer = createHashtagWriter({
    getOrCreateHashtag: async (name) => ({ id: name }),
    findPostHashtags: async () => [{ hashtagId: "one" }, { hashtagId: "two" }],
    createPostHashtags: async () => [],
    deletePostHashtag: async () => {
      deleteCalls += 1;
      return 1;
    },
    incrementHashtag: async () => undefined,
    decrementHashtag: async (id) => void decrements.push(id),
  });

  await writer.decrementPostHashtags("post-1");
  assert.equal(deleteCalls, 0);
  assert.deepEqual(new Set(decrements), new Set(["one", "two"]));
});

test("Hashtag writer preserves collaborator error identity", async () => {
  const original = new Error("database unavailable");
  const writer = createHashtagWriter({
    getOrCreateHashtag: async () => {
      throw original;
    },
    findPostHashtags: async () => [],
    createPostHashtags: async () => [],
    deletePostHashtag: async () => 0,
    incrementHashtag: async () => undefined,
    decrementHashtag: async () => undefined,
  });

  await assert.rejects(
    () => writer.syncPostHashtags("post-1", "#tag"),
    (error) => error === original,
  );
});
