import assert from "node:assert/strict";
import test from "node:test";
import { createProfileMediaCasWriter } from "../../../../src/app/module/profile/profile-media-cas.factory";

const row = (avatar: string | null) => ({
  userId: "user-1",
  avatar,
  coverPhoto: null,
  updatedAt: new Date(),
});

test("Profile media CAS returns the exact URL replaced by its winning retry", async () => {
  const attempts: Array<string | null> = [];
  const writer = createProfileMediaCasWriter({
    read: async () => row("asset-a"),
    compareAndSwap: async ({ expectedUrl }) => {
      attempts.push(expectedUrl);
      return expectedUrl === "asset-a" ? [row("asset-b")] : [];
    },
  });

  const result = await writer.claim({
    userId: "user-1",
    field: "avatar",
    initialExpectedUrl: "old",
    uploadedUrl: "asset-b",
  });
  assert.deepEqual(attempts, ["old", "asset-a"]);
  assert.equal(result.replacedUrl, "asset-a");
  assert.equal(result.row.avatar, "asset-b");
});

test("Profile media CAS supports null and enforces cardinality", async () => {
  const nullWriter = createProfileMediaCasWriter({
    read: async () => row(null),
    compareAndSwap: async ({ expectedUrl }) =>
      expectedUrl === null ? [row("new")] : [],
  });
  assert.equal(
    (
      await nullWriter.claim({
        userId: "user-1",
        field: "avatar",
        initialExpectedUrl: null,
        uploadedUrl: "new",
      })
    ).replacedUrl,
    null,
  );

  const invalidWriter = createProfileMediaCasWriter({
    read: async () => row(null),
    compareAndSwap: async () => [row("one"), row("two")],
  });
  await assert.rejects(
    invalidWriter.claim({
      userId: "user-1",
      field: "avatar",
      initialExpectedUrl: null,
      uploadedUrl: "new",
    }),
    /Profile media update invariant failed/,
  );
});

test("Profile media CAS makes exactly three writes before conflict", async () => {
  let writes = 0;
  let reads = 0;
  const writer = createProfileMediaCasWriter({
    read: async () => {
      reads += 1;
      return row(`fresh-${reads}`);
    },
    compareAndSwap: async () => {
      writes += 1;
      return [];
    },
  });

  await assert.rejects(
    writer.claim({
      userId: "user-1",
      field: "avatar",
      initialExpectedUrl: "old",
      uploadedUrl: "new",
    }),
    /Profile media changed concurrently/,
  );
  assert.equal(writes, 3);
  assert.equal(reads, 2);
});
