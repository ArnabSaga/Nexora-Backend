import assert from "node:assert/strict";
import test from "node:test";
import {
  PostType,
  PostVisibility,
} from "../../../../src/generated/prisma/client";
import type {
  TOriginalPostPayload,
  TPostPayload,
} from "../../../../src/app/module/post/constants/post.select";
import { createPostResponseService } from "../../../../src/app/module/post/services/post-response.factory";
import type { TVoteReadState } from "../../../../src/app/module/vote/vote.interface";

const date = new Date("2026-01-01T00:00:00.000Z");

const createPostPayload = (id: string, repostId: string | null = null) =>
  ({
    id,
    authorId: `author-${id}`,
    communityId: null,
    repostId,
    content: `content-${id}`,
    postType: PostType.SHORT,
    visibility: PostVisibility.PUBLIC,
    isEdited: false,
    isDeleted: false,
    createdAt: date,
    updatedAt: date,
    author: {
      id: `author-${id}`,
      name: `Author ${id}`,
      image: null,
      profile: null,
    },
    community: null,
    media: [],
    hashtags: [],
    mentions: [],
    _count: {
      comments: 0,
      reactions: 0,
      votes: 0,
      reposts: 0,
      bookmarks: 0,
    },
  }) satisfies TPostPayload;

const createOriginalPayload = (id: string) =>
  ({
    id,
    content: `original-${id}`,
    postType: PostType.SHORT,
    visibility: PostVisibility.PUBLIC,
    isDeleted: false,
    createdAt: date,
    author: {
      id: `author-${id}`,
      name: `Author ${id}`,
      image: null,
      profile: null,
    },
    media: [],
    hashtags: [],
    _count: {
      comments: 0,
      reactions: 0,
      votes: 0,
      reposts: 0,
      bookmarks: 0,
    },
  }) satisfies TOriginalPostPayload;

const zeroStates = (ids: string[]) =>
  new Map<string, TVoteReadState>(
    ids.map((id) => [id, { votesCount: 0, voteScore: 0, viewerVote: null }]),
  );

const noBookmarks = (ids: string[]) =>
  new Map(ids.map((id) => [id, false]));

test("Post response enrichment skips original lookup for normal Posts", async () => {
  let originalLookupCalls = 0;
  const voteCalls: string[][] = [];
  const service = createPostResponseService({
    findVisibleOriginalPosts: async () => {
      originalLookupCalls += 1;
      return [];
    },
    getPostVoteStates: async (ids) => {
      voteCalls.push(ids);
      return zeroStates(ids);
    },
    getPostBookmarkStates: async (ids) => noBookmarks(ids),
  });

  const result = await service.enrichPosts([
    createPostPayload("root-a"),
    createPostPayload("root-b"),
  ]);

  assert.equal(originalLookupCalls, 0);
  assert.deepEqual(voteCalls, [["root-a", "root-b"]]);
  assert.deepEqual(
    result.map((post) => post.originalPost),
    [null, null],
  );
});

test("Post response enrichment batches visible originals and keeps invisible tombstones", async () => {
  const originalCalls: string[][] = [];
  const voteCalls: string[][] = [];
  const service = createPostResponseService({
    findVisibleOriginalPosts: async (ids) => {
      originalCalls.push(ids);
      return [
        createOriginalPayload("original-a"),
        createOriginalPayload("original-b"),
      ];
    },
    getPostVoteStates: async (ids) => {
      voteCalls.push(ids);
      return zeroStates(ids);
    },
    getPostBookmarkStates: async (ids) =>
      new Map(ids.map((id) => [id, id === "root-a" || id === "original-b"])),
  });

  const result = await service.enrichPosts([
    createPostPayload("root-a", "original-a"),
    createPostPayload("root-b", "original-a"),
    createPostPayload("root-c", "original-b"),
    createPostPayload("root-d", "original-hidden"),
    createPostPayload("root-e"),
  ]);

  assert.deepEqual(originalCalls, [
    ["original-a", "original-b", "original-hidden"],
  ]);
  assert.deepEqual(voteCalls, [
    [
      "root-a",
      "root-b",
      "root-c",
      "root-d",
      "root-e",
      "original-a",
      "original-b",
    ],
  ]);
  assert.equal(result[0].originalPost?.id, "original-a");
  assert.equal(result[1].originalPost?.id, "original-a");
  assert.equal(result[2].originalPost?.id, "original-b");
  assert.equal(result[0].viewerState.bookmarked, true);
  assert.equal(result[1].viewerState.bookmarked, false);
  assert.equal(
    result[2].originalPost && !("unavailable" in result[2].originalPost)
      ? result[2].originalPost.viewerState.bookmarked
      : false,
    true,
  );
  assert.deepEqual(result[3].originalPost, {
    id: "original-hidden",
    unavailable: true,
  });
  assert.equal(result[4].originalPost, null);
});

test("single Post enrichment delegates to the shared list implementation", async () => {
  const voteCalls: string[][] = [];
  const service = createPostResponseService({
    findVisibleOriginalPosts: async () => [],
    getPostVoteStates: async (ids) => {
      voteCalls.push(ids);
      return zeroStates(ids);
    },
    getPostBookmarkStates: async (ids) => noBookmarks(ids),
  });

  const result = await service.enrichPost(createPostPayload("single"));

  assert.equal(result.id, "single");
  assert.deepEqual(voteCalls, [["single"]]);
});
