ALTER TABLE "post_reaction"
ADD COLUMN "notificationClaimedAt" TIMESTAMP(3);

ALTER TABLE "comment_reaction"
ADD COLUMN "notificationClaimedAt" TIMESTAMP(3);

UPDATE "post_reaction"
SET "notificationClaimedAt" = "createdAt";

UPDATE "comment_reaction"
SET "notificationClaimedAt" = "createdAt";

UPDATE "notification"
SET "message" = CASE
  WHEN "type" = 'FOLLOW' THEN 'started following you'
  WHEN "type" = 'REACTION' AND "targetType" = 'COMMENT' THEN 'reacted to your comment'
  WHEN "type" = 'REACTION' AND "targetType" = 'POST' THEN 'reacted to your post'
  WHEN "type" = 'REACTION' THEN 'reacted to your content'
  WHEN "type" = 'COMMENT' THEN 'commented on your post'
  WHEN "type" = 'REPLY' THEN 'replied to your comment'
  WHEN "type" = 'MENTION' THEN 'mentioned you in a post'
  WHEN "type" = 'REPOST' THEN 'reposted your post'
  WHEN "type" = 'COMMUNITY_INVITE' THEN 'invited you to a community'
  WHEN "type" = 'COMMUNITY_ROLE_UPDATE' THEN 'updated your community role'
  ELSE 'sent you a notification'
END;
