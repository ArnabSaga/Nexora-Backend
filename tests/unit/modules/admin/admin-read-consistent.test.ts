import assert from "node:assert/strict";
import test from "node:test";
import { createConsistentPrismaAdminReader } from "../../../../src/app/module/admin/admin-read-consistent.prisma.factory";
import type { TAdminReader } from "../../../../src/app/module/admin/admin.interface";

const dashboard = {
  users: { total: 0, active: 0, suspended: 0, deleted: 0 },
  posts: { total: 0, active: 0, deleted: 0 },
  communities: { total: 0, active: 0, suspended: 0, deleted: 0 },
  reports: { total: 0, pending: 0, reviewed: 0, resolved: 0, rejected: 0 },
};
const list = {
  data: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

test("Each Admin read opens one RepeatableRead transaction with its callback client", async () => {
  const transactions: Array<{ client: object; isolationLevel: unknown }> = [];
  const calls: Array<{ method: string; client: object }> = [];
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
  const factory = (client: object): TAdminReader => ({
    getDashboard: async () => {
      calls.push({ method: "dashboard", client });
      return dashboard;
    },
    getPosts: async () => {
      calls.push({ method: "posts", client });
      return list;
    },
    getCommunities: async () => {
      calls.push({ method: "communities", client });
      return list;
    },
  });
  const reader = createConsistentPrismaAdminReader(
    root as never,
    factory as never,
  );

  await reader.getDashboard();
  await reader.getPosts({ page: 1, limit: 20 });
  await reader.getCommunities({ page: 1, limit: 20 });

  assert.equal(transactions.length, 3);
  assert.equal(new Set(transactions.map(({ client }) => client)).size, 3);
  for (const transaction of transactions) {
    assert.equal(transaction.isolationLevel, "RepeatableRead");
    assert.equal(
      calls.filter(({ client }) => client === transaction.client).length,
      1,
    );
  }
});

test("Admin consistency wrapper preserves exact reader errors", async () => {
  const sentinel = new Error("sentinel");
  const root = {
    $transaction: async (operation: (client: never) => Promise<unknown>) =>
      operation({} as never),
  };
  const factory = (): TAdminReader => ({
    getDashboard: async () => {
      throw sentinel;
    },
    getPosts: async () => list,
    getCommunities: async () => list,
  });
  const reader = createConsistentPrismaAdminReader(
    root as never,
    factory as never,
  );

  await assert.rejects(reader.getDashboard(), (error) => error === sentinel);
});
