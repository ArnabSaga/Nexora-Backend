import assert from "node:assert/strict";
import test from "node:test";
import AppError from "../../../../src/app/shared/errors/AppError";
import {
  escapeLikePattern,
  normalizeSearchQuery,
} from "../../../../src/app/module/search/search.util";
import {
  buildCommunityBuckets,
  buildHashtagBuckets,
  buildPostBuckets,
  buildUserBuckets,
} from "../../../../src/app/module/search/search.prisma.factory";

test("Search service normalization preserves literal query and escapes patterns in order", () => {
  const result = normalizeSearchQuery(
    { query: "  100%_\\path  ", page: 2, limit: 5 },
    { allowType: false },
  );
  assert.equal(result.normalizedQuery, "100%_\\path");
  assert.equal(result.patternQuery, "100\\%\\_\\\\path");
  assert.equal(result.page, 2);
  assert.equal(result.limit, 5);
});

test("Search service boundary validates keys and semantic integers", () => {
  for (const input of [
    { query: "valid", page: 1.5 },
    { query: "valid", page: Number.POSITIVE_INFINITY },
    { query: "valid", page: Number.MAX_SAFE_INTEGER + 1 },
    { query: "valid", limit: 0 },
    { query: "valid", extra: true },
  ]) {
    assert.throws(
      () => normalizeSearchQuery(input, { allowType: false }),
      (error) => error instanceof AppError && error.statusCode === 400,
    );
  }
});

test("Search bucket builders use insensitive filters and mutually exclusive predicates", () => {
  const query = normalizeSearchQuery({ query: "NESTJS" }, { allowType: false });
  for (const buckets of [
    buildUserBuckets(query),
    buildPostBuckets(query),
    buildCommunityBuckets(query),
    buildHashtagBuckets(query),
  ]) {
    const serialized = JSON.stringify(buckets);
    assert.match(serialized, /"mode":"insensitive"/);
    assert.match(serialized, /"equals":"NESTJS"/);
    assert.match(serialized, /"startsWith":"NESTJS"/);
    assert.match(serialized, /"contains":"NESTJS"/);
    assert.ok("NOT" in (buckets.prefix as { AND: object[] }).AND[1]);
    assert.equal((buckets.contains as { AND: object[] }).AND.length, 3);
  }
});

test("User and Post bucket predicates combine scalar and relation fields", () => {
  const query = normalizeSearchQuery({ query: "john" }, { allowType: false });
  const users = JSON.stringify(buildUserBuckets(query).exact);
  const posts = JSON.stringify(buildPostBuckets(query).exact);
  assert.match(users, /"name"/);
  assert.match(users, /"username"/);
  assert.match(users, /"company"/);
  assert.match(posts, /"content"/);
  assert.match(posts, /"hashtags"/);
});
