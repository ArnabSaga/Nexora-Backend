import assert from "node:assert/strict";
import test from "node:test";
import {
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityVisibility,
  PostType,
  PostVisibility,
} from "../../../../src/generated/prisma/client";
import { createPrismaSearchReader } from "../../../../src/app/module/search/search.prisma.factory";
import { normalizeSearchQuery } from "../../../../src/app/module/search/search.util";
import type { TPostPayload } from "../../../../src/app/module/post/constants/post.select";
import type { TCommunityPayload } from "../../../../src/app/module/community/community.select";

const date = new Date("2026-01-01T00:00:00.000Z");
const normalized = (query: string) =>
  normalizeSearchQuery({ query }, { allowType: false });

const post = {
  id: "post-1",
  authorId: "author-1",
  communityId: null,
  repostId: "original-1",
  content: "search post",
  postType: PostType.SHORT,
  visibility: PostVisibility.PUBLIC,
  isEdited: false,
  isDeleted: false,
  createdAt: date,
  updatedAt: date,
  author: { id: "author-1", name: "Author", image: null, profile: null },
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
} satisfies TPostPayload;

const originalPost = {
  id: "original-1",
  content: "original",
  postType: PostType.SHORT,
  visibility: PostVisibility.PUBLIC,
  isDeleted: false,
  createdAt: date,
  author: { id: "author-1", name: "Author", image: null, profile: null },
  media: [],
  hashtags: [],
  _count: {
    comments: 0,
    reactions: 0,
    votes: 0,
    reposts: 0,
    bookmarks: 0,
  },
};

const community = {
  id: "community-1",
  ownerId: "owner-1",
  name: "Search Community",
  slug: "search-community",
  description: null,
  avatar: null,
  coverPhoto: null,
  visibility: CommunityVisibility.PUBLIC,
  createdAt: date,
  updatedAt: date,
  owner: {
    id: "owner-1",
    name: "Owner",
    image: null,
    createdAt: date,
    profile: null,
    _count: { followers: 0, following: 0 },
  },
  _count: { members: 1 },
} satisfies TCommunityPayload;

test("Post Search enrichment uses only the supplied Prisma client", async () => {
  const calls: string[] = [];
  let countCall = 0;
  let findCall = 0;
  const client = {
    post: {
      count: async () => {
        calls.push("post.count");
        return countCall++ === 0 ? 1 : 0;
      },
      findMany: async () => {
        calls.push("post.findMany");
        return findCall++ === 0 ? [post] : [originalPost];
      },
    },
    postVote: {
      groupBy: async () => {
        calls.push("postVote.groupBy");
        return [];
      },
      findMany: async () => {
        calls.push("postVote.findMany");
        return [];
      },
    },
    commentVote: {},
    bookmark: {
      findMany: async () => {
        calls.push("bookmark.findMany");
        return [];
      },
    },
  };
  const viewer = { id: "viewer-1" } as Express.AuthenticatedUser;

  const result = await createPrismaSearchReader(client as never).searchPosts(
    normalized("search"),
    viewer,
  );

  assert.equal(result.data[0]?.id, post.id);
  assert.equal(calls.filter((call) => call === "post.count").length, 3);
  assert.equal(calls.filter((call) => call === "post.findMany").length, 2);
  assert.equal(calls.filter((call) => call === "postVote.groupBy").length, 1);
  assert.equal(calls.filter((call) => call === "postVote.findMany").length, 1);
  assert.equal(calls.filter((call) => call === "bookmark.findMany").length, 1);
});

test("Community Search enrichment uses only the supplied Prisma client", async () => {
  const calls: string[] = [];
  let countCall = 0;
  const client = {
    community: {
      count: async () => {
        calls.push("community.count");
        return countCall++ === 0 ? 1 : 0;
      },
      findMany: async () => {
        calls.push("community.findMany");
        return [community];
      },
    },
    communityMember: {
      findMany: async () => {
        calls.push("communityMember.findMany");
        return [
          {
            communityId: community.id,
            role: CommunityMemberRole.MEMBER,
            status: CommunityMemberStatus.ACTIVE,
          },
        ];
      },
    },
  };
  const viewer = { id: "viewer-1" } as Express.AuthenticatedUser;

  const result = await createPrismaSearchReader(
    client as never,
  ).searchCommunities(normalized("search"), viewer);

  assert.equal(result.data[0]?.id, community.id);
  assert.deepEqual(result.data[0]?.viewerState, {
    role: CommunityMemberRole.MEMBER,
    status: CommunityMemberStatus.ACTIVE,
  });
  assert.equal(calls.filter((call) => call === "community.count").length, 3);
  assert.equal(calls.filter((call) => call === "community.findMany").length, 1);
  assert.equal(
    calls.filter((call) => call === "communityMember.findMany").length,
    1,
  );
});

test("Hashtag Search performs one batched visible-count aggregation for a full page", async () => {
  let countCall = 0;
  let groupByCalls = 0;
  const hashtags = Array.from({ length: 50 }, (_, index) => ({
    id: `hashtag-${index}`,
    name: `tag-${index}`,
  }));
  const client = {
    hashtag: {
      count: async () => (countCall++ === 0 ? hashtags.length : 0),
      findMany: async () => hashtags,
    },
    postHashtag: {
      groupBy: async () => {
        groupByCalls += 1;
        return hashtags.map((hashtag) => ({
          hashtagId: hashtag.id,
          _count: { hashtagId: 1 },
        }));
      },
    },
  };

  const result = await createPrismaSearchReader(client as never).searchHashtags(
    normalizeSearchQuery({ query: "tag", limit: 50 }, { allowType: false }),
  );

  assert.equal(result.data.length, 50);
  assert.equal(groupByCalls, 1);
});

test("Hashtag Search treats a missing selected visible count as an invariant failure", async () => {
  let countCall = 0;
  const client = {
    hashtag: {
      count: async () => (countCall++ === 0 ? 1 : 0),
      findMany: async () => [{ id: "hashtag-1", name: "tag" }],
    },
    postHashtag: { groupBy: async () => [] },
  };

  await assert.rejects(
    () =>
      createPrismaSearchReader(client as never).searchHashtags(
        normalized("tag"),
      ),
    /visible-count invariant failed/,
  );
});
