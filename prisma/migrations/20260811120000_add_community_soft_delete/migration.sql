ALTER TABLE "community" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "community_deletedAt_isSuspended_visibility_createdAt_idx"
ON "community"("deletedAt", "isSuspended", "visibility", "createdAt");

CREATE INDEX "community_member_communityId_status_joinedAt_idx"
ON "community_member"("communityId", "status", "joinedAt");
