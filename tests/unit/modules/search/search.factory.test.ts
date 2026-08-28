import assert from "node:assert/strict";
import test from "node:test";
import { createSearchService } from "../../../../src/app/module/search/search.factory";
import type { TSearchReader } from "../../../../src/app/module/search/search.interface";

const emptySection = () => ({
  data: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
});

test("Untyped global Search executes all independent sections", async () => {
  const calls: string[] = [];
  const reader = {
    searchUsers: async () => {
      calls.push("users");
      return emptySection();
    },
    searchPosts: async () => {
      calls.push("posts");
      return emptySection();
    },
    searchCommunities: async () => {
      calls.push("communities");
      return emptySection();
    },
    searchHashtags: async () => {
      calls.push("hashtags");
      return emptySection();
    },
  } as TSearchReader;

  const result = await createSearchService(reader).search({ query: "dev" });
  assert.deepEqual(
    new Set(calls),
    new Set(["users", "posts", "communities", "hashtags"]),
  );
  assert.deepEqual(Object.keys(result), [
    "users",
    "posts",
    "communities",
    "hashtags",
  ]);
});

test("Typed global Search executes only its selected domain", async () => {
  const calls: string[] = [];
  const reader = {
    searchUsers: async () => {
      calls.push("users");
      return emptySection();
    },
    searchPosts: async () => {
      calls.push("posts");
      return emptySection();
    },
    searchCommunities: async () => {
      calls.push("communities");
      return emptySection();
    },
    searchHashtags: async () => {
      calls.push("hashtags");
      return emptySection();
    },
  } as TSearchReader;

  const result = await createSearchService(reader).search({
    query: "dev",
    type: "POST",
  });
  assert.deepEqual(calls, ["posts"]);
  assert.deepEqual(Object.keys(result), ["posts"]);
});

test("Dedicated Search rejects a global-only type at the service boundary", () => {
  const reader = {
    searchUsers: async () => emptySection(),
    searchPosts: async () => emptySection(),
    searchCommunities: async () => emptySection(),
    searchHashtags: async () => emptySection(),
  } as TSearchReader;
  assert.throws(() =>
    createSearchService(reader).searchUsers({ query: "dev", type: "USER" }),
  );
});
