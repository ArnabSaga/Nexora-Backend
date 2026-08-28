import assert from "node:assert/strict";
import test from "node:test";
import { createTrendingService } from "../../../../src/app/module/trending/trending.factory";
import type { TTrendingReader } from "../../../../src/app/module/trending/trending.interface";

const emptyPosts = {
  data: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
};

test("Trending captures one clock value and constructs the exact seven-day window", async () => {
  const now = new Date("2026-08-28T12:00:00.000Z");
  let clockCalls = 0;
  let received: Parameters<TTrendingReader["getTrendingPosts"]>[0] | undefined;
  const reader: TTrendingReader = {
    getTrendingPosts: async (query) => {
      received = query;
      return emptyPosts;
    },
    getTrendingHashtags: async () => [],
  };

  await createTrendingService(reader, {
    now: () => {
      clockCalls += 1;
      return now;
    },
  }).getTrendingPosts({});

  assert.equal(clockCalls, 1);
  assert.equal(received?.windowEnd.getTime(), now.getTime());
  assert.equal(
    received?.windowStart.getTime(),
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  );
});

test("Trending service rejects unknown fields and unsafe semantic numbers", async () => {
  const reader = {
    getTrendingPosts: async () => emptyPosts,
    getTrendingHashtags: async () => [],
  } as TTrendingReader;
  const service = createTrendingService(reader, { now: () => new Date() });

  assert.throws(() => service.getTrendingPosts({ page: 1.5 }));
  assert.throws(() =>
    service.getTrendingPosts({ page: 1, extra: true } as never),
  );
  assert.throws(() => service.getTrendingHashtags({ limit: 51 }));
});
