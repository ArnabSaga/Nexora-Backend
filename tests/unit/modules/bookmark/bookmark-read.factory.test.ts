import assert from "node:assert/strict";
import test from "node:test";
import { createBookmarkReadService } from "../../../../src/app/module/bookmark/bookmark-read.factory";

test("Bookmark read factory skips empty and guest queries", async () => {
  let calls = 0;
  const service = createBookmarkReadService({
    getViewerBookmarks: async () => {
      calls += 1;
      return [];
    },
  });

  assert.deepEqual(
    await service.getPostBookmarkStates([], "viewer"),
    new Map(),
  );
  assert.deepEqual(
    await service.getPostBookmarkStates(["post-a", "post-a"]),
    new Map([["post-a", false]]),
  );
  assert.equal(calls, 0);
});

test("Bookmark read factory deduplicates IDs and maps viewer rows", async () => {
  const calls: Array<{ ids: string[]; viewerId: string }> = [];
  const service = createBookmarkReadService({
    getViewerBookmarks: async (ids, viewerId) => {
      calls.push({ ids, viewerId });
      return [{ postId: "post-b" }];
    },
  });

  const states = await service.getPostBookmarkStates(
    ["post-a", "post-b", "post-a"],
    "viewer",
  );

  assert.deepEqual(calls, [{ ids: ["post-a", "post-b"], viewerId: "viewer" }]);
  assert.deepEqual(
    states,
    new Map([
      ["post-a", false],
      ["post-b", true],
    ]),
  );
});
