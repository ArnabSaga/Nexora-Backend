import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateRankedSearchSlices,
  createSearchMeta,
} from "../../../../src/app/module/search/search-ranked-pagination";

test("Ranked pagination stays inside exact bucket", () => {
  assert.deepEqual(
    calculateRankedSearchSlices({
      page: 1,
      limit: 3,
      counts: { exact: 5, prefix: 5, contains: 5 },
    }),
    [{ bucket: "exact", skip: 0, take: 3 }],
  );
});

test("Ranked pagination crosses exact, prefix, and contains boundaries", () => {
  assert.deepEqual(
    calculateRankedSearchSlices({
      page: 1,
      limit: 6,
      counts: { exact: 2, prefix: 2, contains: 5 },
    }),
    [
      { bucket: "exact", skip: 0, take: 2 },
      { bucket: "prefix", skip: 0, take: 2 },
      { bucket: "contains", skip: 0, take: 2 },
    ],
  );
});

test("Ranked pagination handles a page inside later buckets and beyond total", () => {
  assert.deepEqual(
    calculateRankedSearchSlices({
      page: 2,
      limit: 3,
      counts: { exact: 1, prefix: 4, contains: 4 },
    }),
    [
      { bucket: "prefix", skip: 2, take: 2 },
      { bucket: "contains", skip: 0, take: 1 },
    ],
  );
  assert.deepEqual(
    calculateRankedSearchSlices({
      page: 100,
      limit: 10,
      counts: { exact: 1, prefix: 1, contains: 1 },
    }),
    [],
  );
  assert.deepEqual(
    createSearchMeta(100, 10, { exact: 1, prefix: 1, contains: 1 }),
    {
      page: 100,
      limit: 10,
      total: 3,
      totalPages: 1,
    },
  );
});
