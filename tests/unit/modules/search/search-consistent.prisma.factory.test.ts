import assert from "node:assert/strict";
import test from "node:test";
import { createConsistentPrismaSearchReader } from "../../../../src/app/module/search/search-consistent.prisma.factory";
import { createSearchService } from "../../../../src/app/module/search/search.factory";
import type {
  TSearchReader,
  TSearchType,
} from "../../../../src/app/module/search/search.interface";

const emptySection = () => ({
  data: [],
  meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
});

const createHarness = () => {
  const transactions: Array<{ client: object; isolationLevel: unknown }> = [];
  const calls: Array<{ domain: TSearchType; client: object }> = [];
  const root = {
    $transaction: async (
      operation: (client: never) => Promise<unknown>,
      options: { isolationLevel: unknown },
    ) => {
      const client = { transactionId: transactions.length + 1 };
      transactions.push({ client, isolationLevel: options.isolationLevel });
      return operation(client as never);
    },
  };
  const readerFactory = (client: object): TSearchReader => ({
    searchUsers: async () => {
      calls.push({ domain: "USER", client });
      return emptySection();
    },
    searchPosts: async () => {
      calls.push({ domain: "POST", client });
      return emptySection();
    },
    searchCommunities: async () => {
      calls.push({ domain: "COMMUNITY", client });
      return emptySection();
    },
    searchHashtags: async () => {
      calls.push({ domain: "HASHTAG", client });
      return emptySection();
    },
  });
  const service = createSearchService(
    createConsistentPrismaSearchReader(root as never, readerFactory as never),
  );

  return { calls, root, service, transactions };
};

test("Dedicated Search opens exactly one RepeatableRead transaction", async () => {
  const harness = createHarness();
  await harness.service.searchUsers({ query: "user" });

  assert.equal(harness.transactions.length, 1);
  assert.equal(harness.transactions[0]?.isolationLevel, "RepeatableRead");
  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0]?.domain, "USER");
  assert.equal(harness.calls[0]?.client, harness.transactions[0]?.client);
});

test("Typed global Search opens exactly one RepeatableRead transaction", async () => {
  const harness = createHarness();
  await harness.service.search({ query: "post", type: "POST" });

  assert.equal(harness.transactions.length, 1);
  assert.equal(harness.transactions[0]?.isolationLevel, "RepeatableRead");
  assert.equal(harness.calls[0]?.domain, "POST");
  assert.equal(harness.calls[0]?.client, harness.transactions[0]?.client);
});

test("Untyped global Search opens four distinct RepeatableRead transactions", async () => {
  const harness = createHarness();
  await harness.service.search({ query: "global" });

  assert.equal(harness.transactions.length, 4);
  assert.equal(
    new Set(harness.transactions.map(({ client }) => client)).size,
    4,
  );
  assert.deepEqual(
    new Set(harness.calls.map(({ domain }) => domain)),
    new Set<TSearchType>(["USER", "POST", "COMMUNITY", "HASHTAG"]),
  );
  for (const transaction of harness.transactions) {
    assert.equal(transaction.isolationLevel, "RepeatableRead");
    assert.equal(
      harness.calls.filter(({ client }) => client === transaction.client)
        .length,
      1,
    );
  }
});

test("Consistent Search reader preserves low-level error identity", async () => {
  const sentinel = new Error("sentinel");
  const root = {
    $transaction: async (operation: (client: never) => Promise<unknown>) =>
      operation({} as never),
  };
  const readerFactory = (): TSearchReader => ({
    searchUsers: async () => {
      throw sentinel;
    },
    searchPosts: async () => emptySection(),
    searchCommunities: async () => emptySection(),
    searchHashtags: async () => emptySection(),
  });
  const reader = createConsistentPrismaSearchReader(
    root as never,
    readerFactory as never,
  );

  await assert.rejects(
    () =>
      reader.searchUsers({
        normalizedQuery: "user",
        patternQuery: "user",
        page: 1,
        limit: 10,
      }),
    (error) => error === sentinel,
  );
});
