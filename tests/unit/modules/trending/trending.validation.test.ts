import assert from "node:assert/strict";
import test from "node:test";
import { TrendingValidation } from "../../../../src/app/module/trending/trending.validation";

test("Trending HTTP validation applies defaults and canonical numeric syntax", () => {
  assert.deepEqual(TrendingValidation.postQuery.parse({}), {
    page: 1,
    limit: 10,
  });
  assert.deepEqual(
    TrendingValidation.postQuery.parse({ page: "2", limit: "50" }),
    {
      page: 2,
      limit: 50,
    },
  );

  for (const value of ["01", "+1", "1.0", "1e2", "0", "10001"]) {
    assert.equal(
      TrendingValidation.postQuery.safeParse({ page: value }).success,
      false,
      value,
    );
  }
  assert.equal(
    TrendingValidation.postQuery.safeParse({ limit: ["1", "2"] }).success,
    false,
  );
  assert.equal(
    TrendingValidation.postQuery.safeParse({ unknown: "value" }).success,
    false,
  );
});
