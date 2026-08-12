CREATE TYPE "NotificationTargetType" AS ENUM ('POST', 'COMMENT', 'COMMUNITY');

ALTER TABLE "notification"
ADD COLUMN "sourceKey" TEXT,
ADD COLUMN "targetType" "NotificationTargetType",
ADD COLUMN "targetId" TEXT;

UPDATE "notification"
SET
  "targetType" = CASE
    WHEN "commentId" IS NOT NULL THEN 'COMMENT'::"NotificationTargetType"
    WHEN "postId" IS NOT NULL THEN 'POST'::"NotificationTargetType"
    WHEN "communityId" IS NOT NULL THEN 'COMMUNITY'::"NotificationTargetType"
    ELSE NULL
  END,
  "targetId" = COALESCE("commentId", "postId", "communityId");

DROP INDEX "notification_receiverId_idx";
DROP INDEX "notification_isRead_idx";
DROP INDEX "notification_createdAt_idx";

CREATE UNIQUE INDEX "notification_sourceKey_key" ON "notification"("sourceKey");
CREATE INDEX "notification_receiverId_createdAt_id_idx"
ON "notification"("receiverId", "createdAt", "id");
CREATE INDEX "notification_receiverId_isRead_createdAt_id_idx"
ON "notification"("receiverId", "isRead", "createdAt", "id");
