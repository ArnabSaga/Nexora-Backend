import { UserStatus } from "../../../generated/prisma/client";
import type { Prisma } from "../../../generated/prisma/client";

export const ELIGIBLE_COMMENT_AUTHOR_WHERE = {
  status: UserStatus.ACTIVE,
  deletedAt: null,
} satisfies Prisma.UserWhereInput;

export const ELIGIBLE_COMMENT_WHERE = {
  isDeleted: false,
  author: {
    is: ELIGIBLE_COMMENT_AUTHOR_WHERE,
  },
} satisfies Prisma.CommentWhereInput;

export const ELIGIBLE_TOP_LEVEL_COMMENT_WHERE = {
  ...ELIGIBLE_COMMENT_WHERE,
  parentCommentId: null,
} satisfies Prisma.CommentWhereInput;

export const DISPLAYABLE_DIRECT_REPLY_WHERE = {
  ...ELIGIBLE_COMMENT_WHERE,
  parentCommentId: {
    not: null,
  },
  parentComment: {
    is: ELIGIBLE_TOP_LEVEL_COMMENT_WHERE,
  },
} satisfies Prisma.CommentWhereInput;

export const DISPLAYABLE_POST_COMMENT_WHERE = {
  OR: [
    ELIGIBLE_TOP_LEVEL_COMMENT_WHERE,
    DISPLAYABLE_DIRECT_REPLY_WHERE,
  ],
} satisfies Prisma.CommentWhereInput;
