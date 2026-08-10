import type { Prisma } from "../../../generated/prisma/client";
import { DISPLAYABLE_DIRECT_REPLY_WHERE } from "../../shared/policies/comment.policy";

const AUTHOR = {
  id: true,
  name: true,
  image: true,
  profile: {
    select: {
      username: true,
      headline: true,
      avatar: true,
    },
  },
} satisfies Prisma.UserSelect;

const REPLY = {
  id: true,
  content: true,
  isEdited: true,
  parentCommentId: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: AUTHOR,
  },
  _count: {
    select: {
      reactions: true,
      votes: true,
    },
  },
} satisfies Prisma.CommentSelect;

const PUBLIC = {
  id: true,
  content: true,
  isEdited: true,
  parentCommentId: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: AUTHOR,
  },
  replies: {
    where: DISPLAYABLE_DIRECT_REPLY_WHERE,
    orderBy: [
      {
        createdAt: "asc",
      },
      {
        id: "asc",
      },
    ],
    select: REPLY,
  },
  _count: {
    select: {
      replies: {
        where: DISPLAYABLE_DIRECT_REPLY_WHERE,
      },
      reactions: true,
      votes: true,
    },
  },
} satisfies Prisma.CommentSelect;

export const CommentSelect = {
  AUTHOR,
  REPLY,
  PUBLIC,
} as const;

export type TCommentPublicPayload = Prisma.CommentGetPayload<{
  select: typeof CommentSelect.PUBLIC;
}>;

export type TCommentReplyPayload = Prisma.CommentGetPayload<{
  select: typeof CommentSelect.REPLY;
}>;
