import type { Prisma } from "../../../generated/prisma/client";
import { ACTIVE_PUBLIC_USER_WHERE } from "../../shared/policies/user.policy";
import type { TMentionResponse } from "./mention.interface";

const MENTIONED_USER_SELECT = {
  id: true,
  name: true,
  image: true,
  profile: {
    select: {
      username: true,
      avatar: true,
    },
  },
} satisfies Prisma.UserSelect;

const POST_MENTION_SELECT = {
  id: true,
  mentionedUser: { select: MENTIONED_USER_SELECT },
} satisfies Prisma.PostMentionSelect;

const COMMENT_MENTION_SELECT = {
  id: true,
  mentionedUser: { select: MENTIONED_USER_SELECT },
} satisfies Prisma.CommentMentionSelect;

export const POST_MENTIONS_RELATION_ARGS = {
  where: { mentionedUser: { is: ACTIVE_PUBLIC_USER_WHERE } },
  orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  select: POST_MENTION_SELECT,
} satisfies Prisma.Post$mentionsArgs;

export const COMMENT_MENTIONS_RELATION_ARGS = {
  where: { mentionedUser: { is: ACTIVE_PUBLIC_USER_WHERE } },
  orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  select: COMMENT_MENTION_SELECT,
} satisfies Prisma.Comment$mentionsArgs;

type TMentionResponsePayload = {
  id: string;
  mentionedUser: {
    id: string;
    name: string;
    image: string | null;
    profile: { username: string | null; avatar: string | null } | null;
  };
};

export const mapMentionResponse = (
  mention: TMentionResponsePayload,
): TMentionResponse => ({
  id: mention.id,
  user: {
    id: mention.mentionedUser.id,
    name: mention.mentionedUser.name,
    username:
      mention.mentionedUser.profile?.username ?? mention.mentionedUser.id,
    avatar:
      mention.mentionedUser.profile?.avatar ??
      mention.mentionedUser.image ??
      null,
  },
});
