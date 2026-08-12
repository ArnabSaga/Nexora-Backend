DROP INDEX "bookmark_userId_idx";

CREATE INDEX "bookmark_userId_createdAt_id_idx" ON "bookmark"("userId", "createdAt", "id");
