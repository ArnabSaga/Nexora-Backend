import assert from "node:assert/strict";
import test from "node:test";
import {
  parseNonNegativeIntegerEnv,
  resolveTrustProxyHops,
} from "../../../src/app/config/env.utils";

test("proxy hop parser accepts non-negative safe integers", () => {
  assert.equal(parseNonNegativeIntegerEnv("TRUST_PROXY_HOPS", "0"), 0);
  assert.equal(parseNonNegativeIntegerEnv("TRUST_PROXY_HOPS", "2"), 2);
  assert.equal(
    parseNonNegativeIntegerEnv("TRUST_PROXY_HOPS", undefined, 0),
    0,
  );
});

test("proxy hop parser rejects missing, fractional, negative, and unsafe values", () => {
  for (const value of [undefined, "-1", "1.5", "abc", "9007199254740992"]) {
    assert.throws(() =>
      parseNonNegativeIntegerEnv("TRUST_PROXY_HOPS", value),
    );
  }
});

test("proxy hops default outside production and are required in production", () => {
  assert.equal(resolveTrustProxyHops("development", undefined), 0);
  assert.equal(resolveTrustProxyHops("test", undefined), 0);
  assert.equal(resolveTrustProxyHops("production", "1"), 1);
  assert.throws(() => resolveTrustProxyHops("production", undefined));
});
