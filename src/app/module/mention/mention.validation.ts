import { z } from "zod";
import { MENTION_MAX_USERS } from "./mention.constant";

const mentionedUserId = z.cuid({
  error: "Invalid mentioned user id",
});

export const MentionValidation = {
  mentionedUserIds: z.array(mentionedUserId).max(MENTION_MAX_USERS),
} as const;
