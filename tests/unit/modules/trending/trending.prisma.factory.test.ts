import assert from "node:assert/strict";
import test from "node:test";
import { TRENDING_POST_ORDER_BY } from "../../../../src/app/module/trending/trending.constant";
import { createPrismaTrendingReader } from "../../../../src/app/module/trending/trending.prisma.factory";

const query = {
  page: 2,
  limit: 3,
  windowStart: new Date("2026-08-21T00:00:00.000Z"),
  windowEnd: new Date("2026-08-28T00:00:00.000Z"),
};

test("Trending Post count and fetch share candidates and use the complete DB order", async () => {
  let countWhere: unknown;
  let fetch: Record<string, unknown> | undefined;
  const client = {
    post: {
      count: async (args: { where: unknown }) => {
        countWhere = args.where;
        return 0;
      },
      findMany: async (args: Record<string, unknown>) => {
        fetch = args;
        return [];
      },
    },
    postVote: { groupBy: async () => [], findMany: async () => [] },
    commentVote: {},
    bookmark: { findMany: async () => [] },
  };

  const result = await createPrismaTrendingReader(
    client as never,
  ).getTrendingPosts(query);

  assert.equal(fetch?.where, countWhere);
  assert.deepEqual(fetch?.orderBy, [...TRENDING_POST_ORDER_BY]);
  assert.equal(fetch?.skip, 3);
  assert.equal(fetch?.take, 3);
  assert.deepEqual(result.meta, {
    page: 2,
    limit: 3,
    total: 0,
    totalPages: 0,
  });
  const where = countWhere as { AND: Array<Record<string, unknown>> };
  assert.deepEqual(where.AND[1], {
    createdAt: { gte: query.windowStart, lte: query.windowEnd },
  });
});

test("Trending Hashtags use one aggregate, one batch fetch, and preserve ranking", async () => {
  let groupCalls = 0;
  let fetchCalls = 0;
  let perIdCalls = 0;
  let groupArgs: Record<string, unknown> | undefined;
  let fetchArgs: Record<string, unknown> | undefined;
  const unexpectedPerIdRead = async () => {
    perIdCalls += 1;
    throw new Error("Trending Hashtags must not perform per-ID reads");
  };
  const client = {
    postHashtag: {
      groupBy: async (args: Record<string, unknown>) => {
        groupCalls += 1;
        groupArgs = args;
        return [
          { hashtagId: "tag-b", _count: { hashtagId: 4 } },
          { hashtagId: "tag-a", _count: { hashtagId: 2 } },
        ];
      },
    },
    hashtag: {
      findMany: async (args: Record<string, unknown>) => {
        fetchCalls += 1;
        fetchArgs = args;
        return [
          { id: "tag-a", name: "alpha" },
          { id: "tag-b", name: "beta" },
        ];
      },
      findUnique: unexpectedPerIdRead,
      findUniqueOrThrow: unexpectedPerIdRead,
    },
  };

  const result = await createPrismaTrendingReader(
    client as never,
  ).getTrendingHashtags({ ...query, limit: 10 });

  assert.equal(groupCalls, 1);
  assert.equal(fetchCalls, 1);
  assert.equal(perIdCalls, 0);
  assert.deepEqual(groupArgs?.by, ["hashtagId"]);
  assert.deepEqual(groupArgs?._count, { hashtagId: true });
  assert.deepEqual(groupArgs?.orderBy, [
    { _count: { hashtagId: "desc" } },
    { hashtagId: "asc" },
  ]);
  assert.equal(groupArgs?.take, 10);
  const groupWhere = groupArgs?.where as {
    post: { is: { AND: Array<Record<string, unknown>> } };
  };
  assert.deepEqual(groupWhere.post.is.AND[1], {
    createdAt: { gte: query.windowStart, lte: query.windowEnd },
  });
  assert.deepEqual(fetchArgs?.where, {
    id: { in: ["tag-b", "tag-a"] },
  });
  assert.deepEqual(fetchArgs?.select, { id: true, name: true });
  assert.deepEqual(result, [
    { id: "tag-b", name: "beta", postCount: 4 },
    { id: "tag-a", name: "alpha", postCount: 2 },
  ]);
});

test("Trending Hashtags fail when a selected row cannot be resolved", async () => {
  const sentinelClient = {
    postHashtag: {
      groupBy: async () => [{ hashtagId: "missing", _count: { hashtagId: 1 } }],
    },
    hashtag: { findMany: async () => [] },
  };

  await assert.rejects(
    () =>
      createPrismaTrendingReader(sentinelClient as never).getTrendingHashtags({
        ...query,
        limit: 10,
      }),
    /selection invariant failed/,
  );
});
