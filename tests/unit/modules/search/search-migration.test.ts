import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../../../prisma/migrations/20260814180000_search_trigram_indexes/migration.sql",
    import.meta.url,
  ),
  "utf8",
);

test("Search migration enables pg_trgm before focused GIN indexes", () => {
  const extensionIndex = migration.indexOf(
    "CREATE EXTENSION IF NOT EXISTS pg_trgm",
  );
  const firstIndex = migration.indexOf("CREATE INDEX");
  assert.ok(extensionIndex >= 0 && extensionIndex < firstIndex);

  const expected = new Map([
    ["user_name_trgm_idx", ['"user"', '"name"']],
    ["profile_username_trgm_idx", ['"profile"', '"username"']],
    ["profile_headline_trgm_idx", ['"profile"', '"headline"']],
    ["profile_profession_trgm_idx", ['"profile"', '"profession"']],
    ["profile_company_trgm_idx", ['"profile"', '"company"']],
    ["post_content_trgm_idx", ['"post"', '"content"']],
    ["community_name_trgm_idx", ['"community"', '"name"']],
    ["community_slug_trgm_idx", ['"community"', '"slug"']],
    ["community_description_trgm_idx", ['"community"', '"description"']],
    ["hashtag_name_trgm_idx", ['"hashtag"', '"name"']],
  ]);
  const statements = [...migration.matchAll(/CREATE INDEX "([^"]+)"[^;]+;/g)];
  assert.equal(
    (migration.match(/CREATE EXTENSION IF NOT EXISTS pg_trgm/g) ?? []).length,
    1,
  );
  assert.equal(statements.length, expected.size);
  assert.deepEqual(
    new Set(statements.map((statement) => statement[1])),
    new Set(expected.keys()),
  );
  for (const statement of statements) {
    const name = statement[1];
    const sql = statement[0];
    const target = name ? expected.get(name) : undefined;
    assert.ok(target, `unexpected Search index ${name}`);
    assert.match(sql, / USING GIN /);
    assert.match(sql, / gin_trgm_ops\)/);
    assert.ok(sql.includes(target[0]));
    assert.ok(sql.includes(target[1]));
  }
  assert.doesNotMatch(migration, /ALTER TABLE|DROP |UPDATE |DELETE |INSERT /i);
});
