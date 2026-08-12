import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolve } from "node:path";

const migrationPath = resolve(
  "prisma/migrations/20260813100000_report_module/migration.sql",
);

test("Report migration preserves legacy text and makes details nullable", async () => {
  const sql = await readFile(migrationPath, "utf8");
  for (const table of [
    "user_report",
    "post_report",
    "comment_report",
    "community_report",
  ]) {
    assert.match(
      sql,
      new RegExp(`ALTER TABLE "${table}" RENAME COLUMN "reason" TO "details"`),
    );
    assert.match(
      sql,
      new RegExp(`ALTER TABLE "${table}" ALTER COLUMN "details" DROP NOT NULL`),
    );
    assert.match(
      sql,
      new RegExp(`ALTER TABLE "${table}" ALTER COLUMN "reason" DROP DEFAULT`),
    );
  }
});
