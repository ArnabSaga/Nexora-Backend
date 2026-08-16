import assert from "node:assert/strict";
import test from "node:test";
import { SearchValidation } from "../../../../src/app/module/search/search.validation";

test("Search HTTP validation trims query and applies defaults", () => {
  assert.deepEqual(SearchValidation.globalQuery.parse({ query: "  AI  " }), {
    query: "AI",
    page: 1,
    limit: 10,
  });
});

test("Search HTTP validation enforces query length and strict keys", () => {
  for (const query of [" ", "a", "a".repeat(101)]) {
    assert.equal(
      SearchValidation.globalQuery.safeParse({ query }).success,
      false,
    );
  }
  assert.equal(
    SearchValidation.globalQuery.safeParse({ query: "valid", unknown: "x" })
      .success,
    false,
  );
  assert.equal(
    SearchValidation.dedicatedQuery.safeParse({ query: "valid", type: "USER" })
      .success,
    false,
  );
});

test("Search HTTP validation rejects arrays and noncanonical numeric text", () => {
  for (const value of ["01", "+1", "1.0", "1e2", "-1", "Infinity"]) {
    assert.equal(
      SearchValidation.globalQuery.safeParse({ query: "valid", page: value })
        .success,
      false,
      value,
    );
  }
  assert.equal(
    SearchValidation.globalQuery.safeParse({ query: ["one", "two"] }).success,
    false,
  );
  assert.equal(
    SearchValidation.globalQuery.safeParse({
      query: "valid",
      limit: ["5", "10"],
    }).success,
    false,
  );
});

test("Search global type accepts only supported domains", () => {
  for (const type of ["USER", "POST", "COMMUNITY", "HASHTAG"]) {
    assert.equal(
      SearchValidation.globalQuery.safeParse({ query: "valid", type }).success,
      true,
    );
  }
  assert.equal(
    SearchValidation.globalQuery.safeParse({ query: "valid", type: "EMAIL" })
      .success,
    false,
  );
});
