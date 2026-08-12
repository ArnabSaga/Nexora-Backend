CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'HATE_SPEECH', 'VIOLENCE', 'SEXUAL_CONTENT', 'MISINFORMATION', 'IMPERSONATION', 'PRIVACY', 'OTHER');
CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'POST', 'COMMENT', 'COMMUNITY');

ALTER TABLE "user_report" RENAME COLUMN "reason" TO "details";
ALTER TABLE "post_report" RENAME COLUMN "reason" TO "details";
ALTER TABLE "comment_report" RENAME COLUMN "reason" TO "details";
ALTER TABLE "community_report" RENAME COLUMN "reason" TO "details";

ALTER TABLE "user_report" ALTER COLUMN "details" DROP NOT NULL;
ALTER TABLE "post_report" ALTER COLUMN "details" DROP NOT NULL;
ALTER TABLE "comment_report" ALTER COLUMN "details" DROP NOT NULL;
ALTER TABLE "community_report" ALTER COLUMN "details" DROP NOT NULL;

ALTER TABLE "user_report" ADD COLUMN "reason" "ReportReason" NOT NULL DEFAULT 'OTHER', ADD COLUMN "reviewedById" TEXT, ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "post_report" ADD COLUMN "reason" "ReportReason" NOT NULL DEFAULT 'OTHER', ADD COLUMN "reviewedById" TEXT, ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "comment_report" ADD COLUMN "reason" "ReportReason" NOT NULL DEFAULT 'OTHER', ADD COLUMN "reviewedById" TEXT, ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "community_report" ADD COLUMN "reason" "ReportReason" NOT NULL DEFAULT 'OTHER', ADD COLUMN "reviewedById" TEXT, ADD COLUMN "reviewedAt" TIMESTAMP(3);

ALTER TABLE "user_report" ALTER COLUMN "reason" DROP DEFAULT;
ALTER TABLE "post_report" ALTER COLUMN "reason" DROP DEFAULT;
ALTER TABLE "comment_report" ALTER COLUMN "reason" DROP DEFAULT;
ALTER TABLE "community_report" ALTER COLUMN "reason" DROP DEFAULT;

ALTER TABLE "user_report" ADD CONSTRAINT "user_report_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "post_report" ADD CONSTRAINT "post_report_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comment_report" ADD CONSTRAINT "comment_report_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "community_report" ADD CONSTRAINT "community_report_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "user_report_reporterId_idx"; DROP INDEX "user_report_status_idx"; DROP INDEX "user_report_createdAt_idx";
DROP INDEX "post_report_reporterId_idx"; DROP INDEX "post_report_status_idx"; DROP INDEX "post_report_createdAt_idx";
DROP INDEX "comment_report_reporterId_idx"; DROP INDEX "comment_report_status_idx"; DROP INDEX "comment_report_createdAt_idx";
DROP INDEX "community_report_reporterId_idx"; DROP INDEX "community_report_status_idx"; DROP INDEX "community_report_createdAt_idx";

CREATE INDEX "user_report_reporterId_reportedUserId_status_idx" ON "user_report"("reporterId", "reportedUserId", "status");
CREATE INDEX "user_report_status_createdAt_id_idx" ON "user_report"("status", "createdAt", "id");
CREATE INDEX "user_report_reason_createdAt_id_idx" ON "user_report"("reason", "createdAt", "id");
CREATE INDEX "post_report_reporterId_postId_status_idx" ON "post_report"("reporterId", "postId", "status");
CREATE INDEX "post_report_status_createdAt_id_idx" ON "post_report"("status", "createdAt", "id");
CREATE INDEX "post_report_reason_createdAt_id_idx" ON "post_report"("reason", "createdAt", "id");
CREATE INDEX "comment_report_reporterId_commentId_status_idx" ON "comment_report"("reporterId", "commentId", "status");
CREATE INDEX "comment_report_status_createdAt_id_idx" ON "comment_report"("status", "createdAt", "id");
CREATE INDEX "comment_report_reason_createdAt_id_idx" ON "comment_report"("reason", "createdAt", "id");
CREATE INDEX "community_report_reporterId_communityId_status_idx" ON "community_report"("reporterId", "communityId", "status");
CREATE INDEX "community_report_status_createdAt_id_idx" ON "community_report"("status", "createdAt", "id");
CREATE INDEX "community_report_reason_createdAt_id_idx" ON "community_report"("reason", "createdAt", "id");
