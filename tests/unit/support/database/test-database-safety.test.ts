import assert from "node:assert/strict";
import test from "node:test";
import {
  assertIsolatedDatabase,
  parseDatabaseIdentity,
} from "../../../support/database/test-database";

test("database identity normalizes protocol, port, path, and schema", () => {
  const identity = parseDatabaseIdentity(
    "postgres://user:pass@LOCALHOST/nexora%5Ftest",
    "TEST_DATABASE_URL",
  );

  assert.deepEqual(identity, {
    host: "localhost",
    port: "5432",
    database: "nexora_test",
    schema: "public",
    isLoopback: true,
  });
});

test("database safety rejects equivalent identities", () => {
  assert.throws(() =>
    assertIsolatedDatabase(
      "postgres://dev:one@db.example.com:5432/nexora",
      "postgresql://test:two@DB.EXAMPLE.COM/nexora?schema=public",
    ),
  );
});

test("database safety treats loopback aliases as the same database", () => {
  assert.throws(() =>
    assertIsolatedDatabase(
      "postgres://dev:one@localhost:5432/nexora",
      "postgres://test:two@127.0.0.1:5432/nexora?schema=other",
    ),
  );
  assert.throws(() =>
    assertIsolatedDatabase(
      "postgres://dev:one@localhost:5432/nexora",
      "postgres://test:two@[::1]:6543/nexora",
    ),
  );
});

test("database safety permits distinct database names", () => {
  assert.doesNotThrow(() =>
    assertIsolatedDatabase(
      "postgres://dev:one@localhost:5432/nexora",
      "postgres://test:two@127.0.0.1:5432/nexora_test",
    ),
  );
});
