-- Remove historical duplicate Post mentions while preserving the oldest row.
WITH "ranked_post_mentions" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "postId", "mentionedUserId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS "row_number"
  FROM "post_mention"
)
DELETE FROM "post_mention"
WHERE "id" IN (
  SELECT "id"
  FROM "ranked_post_mentions"
  WHERE "row_number" > 1
);

-- Remove historical duplicate Comment mentions while preserving the oldest row.
WITH "ranked_comment_mentions" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "commentId", "mentionedUserId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS "row_number"
  FROM "comment_mention"
)
DELETE FROM "comment_mention"
WHERE "id" IN (
  SELECT "id"
  FROM "ranked_comment_mentions"
  WHERE "row_number" > 1
);

CREATE UNIQUE INDEX "post_mention_postId_mentionedUserId_key"
ON "post_mention"("postId", "mentionedUserId");

CREATE UNIQUE INDEX "comment_mention_commentId_mentionedUserId_key"
ON "comment_mention"("commentId", "mentionedUserId");
