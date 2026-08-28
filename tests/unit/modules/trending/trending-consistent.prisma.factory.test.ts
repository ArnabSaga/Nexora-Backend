import assert from "node:assert/strict";
import test from "node:test";
import { createConsistentPrismaTrendingReader } from "../../../../src/app/module/trending/trending-consistent.prisma.factory";
import type { TTrendingReader } from "../../../../src/app/module/trending/trending.interface";

const query = {
  page: 1,
  limit: 10,
  windowStart: new Date("2026-08-21T00:00:00.000Z"),
  windowEnd: new Date("2026-08-28T00:00:00.000Z"),
};

test("Each Trending method opens one supplied-client RepeatableRead transaction", async () => {
  const transactions: Array<{ client: object; isolationLevel: unknown }> = [];
  const readerClients: object[] = [];
  const root = {
    $transaction: async (
      operation: (client: never) => Promise<unknown>,
      options: { isolationLevel: unknown },
    ) => {
      const client = { id: transactions.length + 1 };
      transactions.push({ client, isolationLevel: options.isolationLevel });
      return operation(client as never);
    },
  };
  const readerFactory = (client: object): TTrendingReader => ({
    getTrendingPosts: async () => {
      readerClients.push(client);
      return {
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    },
    getTrendingHashtags: async () => {
      readerClients.push(client);
      return [];
    },
  });
  const reader = createConsistentPrismaTrendingReader(
    root as never,
    readerFactory as never,
  );

  await reader.getTrendingPosts(query);
  await reader.getTrendingHashtags({ ...query, limit: 10 });

  assert.equal(transactions.length, 2);
  assert.equal(new Set(transactions.map(({ client }) => client)).size, 2);
  assert.deepEqual(
    transactions.map(({ isolationLevel }) => isolationLevel),
    ["RepeatableRead", "RepeatableRead"],
  );
  assert.deepEqual(
    readerClients,
    transactions.map(({ client }) => client),
  );
});

test("Trending consistency wrapper preserves reader error identity", async () => {
  const sentinel = new Error("sentinel");
  const root = {
    $transaction: async (operation: (client: never) => Promise<unknown>) =>
      operation({} as never),
  };
  const readerFactory = (): TTrendingReader => ({
    getTrendingPosts: async () => {
      throw sentinel;
    },
    getTrendingHashtags: async () => [],
  });
  const reader = createConsistentPrismaTrendingReader(
    root as never,
    readerFactory as never,
  );

  await assert.rejects(
    () => reader.getTrendingPosts(query),
    (error) => error === sentinel,
  );
});
