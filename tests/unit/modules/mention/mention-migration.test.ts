import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "prisma/migrations/20260814120000_mention_pair_uniqueness/migration.sql",
  "utf8",
);

test("Mention migration removes deterministic duplicates before pair uniqueness", () => {
  const postCleanup = migration.indexOf(
    'PARTITION BY "postId", "mentionedUserId"',
  );
  const commentCleanup = migration.indexOf(
    'PARTITION BY "commentId", "mentionedUserId"',
  );
  const survivorOrder = migration.match(/ORDER BY "createdAt" ASC, "id" ASC/g);
  const postUnique = migration.indexOf(
    'CREATE UNIQUE INDEX "post_mention_postId_mentionedUserId_key"',
  );
  const commentUnique = migration.indexOf(
    'CREATE UNIQUE INDEX "comment_mention_commentId_mentionedUserId_key"',
  );

  assert.ok(postCleanup >= 0 && postCleanup < postUnique);
  assert.ok(commentCleanup >= 0 && commentCleanup < commentUnique);
  assert.equal(survivorOrder?.length, 2);
  assert.doesNotMatch(migration, /INSERT INTO "notification"/i);
});
