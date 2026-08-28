import assert from "node:assert/strict";
import test from "node:test";
import status from "http-status";
import AppError from "../../../../src/app/shared/errors/AppError";
import { createCommunityStatusWriter } from "../../../../src/app/module/admin/community-status.factory";

const timestamp = new Date("2026-08-16T00:00:00.000Z");
const row = (isSuspended: boolean) => ({
  id: "community-id",
  isSuspended,
  deletedAt: null,
  updatedAt: timestamp,
});

test("Community status no-op linearizes at the read without writing", async () => {
  let writes = 0;
  const writer = createCommunityStatusWriter({
    read: async () => row(false),
    compareAndSwap: async () => {
      writes += 1;
      return [];
    },
  });
  assert.deepEqual(await writer.updateStatus("community-id", "ACTIVE"), {
    id: "community-id",
    status: "ACTIVE",
    updatedAt: timestamp,
  });
  assert.equal(writes, 0);
});

test("Community status returns the atomic winning row without rereading", async () => {
  let reads = 0;
  const transitioned = {
    ...row(true),
    updatedAt: new Date(timestamp.getTime() + 1),
  };
  const writer = createCommunityStatusWriter({
    read: async () => {
      reads += 1;
      return row(false);
    },
    compareAndSwap: async (input) => {
      assert.deepEqual(input, {
        id: "community-id",
        expectedIsSuspended: false,
        desiredIsSuspended: true,
      });
      return [transitioned];
    },
  });
  const result = await writer.updateStatus("community-id", "SUSPENDED");
  assert.equal(result.status, "SUSPENDED");
  assert.equal(result.updatedAt, transitioned.updatedAt);
  assert.equal(reads, 1);
});

test("Community status converges after a lost CAS", async () => {
  let reads = 0;
  let writes = 0;
  const writer = createCommunityStatusWriter({
    read: async () => row(reads++ > 0),
    compareAndSwap: async () => {
      writes += 1;
      return [];
    },
  });
  assert.equal(
    (await writer.updateStatus("community-id", "SUSPENDED")).status,
    "SUSPENDED",
  );
  assert.equal(reads, 2);
  assert.equal(writes, 1);
});

test("Community deletion after a lost CAS produces 404", async () => {
  let reads = 0;
  const writer = createCommunityStatusWriter({
    read: async () =>
      reads++ === 0 ? row(false) : { ...row(false), deletedAt: timestamp },
    compareAndSwap: async () => [],
  });
  await assert.rejects(
    writer.updateStatus("community-id", "SUSPENDED"),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === status.NOT_FOUND &&
      error.message === "Community not found",
  );
});

test("Community status enforces cardinality and three CAS attempts", async () => {
  const invariantWriter = createCommunityStatusWriter({
    read: async () => row(false),
    compareAndSwap: async () => [row(true), row(true)],
  });
  await assert.rejects(
    invariantWriter.updateStatus("community-id", "SUSPENDED"),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === status.INTERNAL_SERVER_ERROR,
  );

  let reads = 0;
  let writes = 0;
  const contendedWriter = createCommunityStatusWriter({
    read: async () => {
      reads += 1;
      return row(false);
    },
    compareAndSwap: async () => {
      writes += 1;
      return [];
    },
  });
  await assert.rejects(
    contendedWriter.updateStatus("community-id", "SUSPENDED"),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === status.CONFLICT &&
      error.message === "Community status changed concurrently",
  );
  assert.equal(reads, 3);
  assert.equal(writes, 3);
});

test("Community status preserves collaborator error identity", async () => {
  const sentinel = new Error("sentinel");
  const writer = createCommunityStatusWriter({
    read: async () => {
      throw sentinel;
    },
    compareAndSwap: async () => [],
  });
  await assert.rejects(
    writer.updateStatus("community-id", "ACTIVE"),
    (error) => error === sentinel,
  );
});
