import type { Prisma } from "../../../../generated/prisma/client";
import { DISPLAYABLE_POST_COMMENT_WHERE } from "../../../shared/policies/comment.policy";

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

const MEDIA = {
  id: true,
  url: true,
  mediaType: true,
  publicId: true,
  createdAt: true,
} satisfies Prisma.PostMediaSelect;

const COMMUNITY = {
  id: true,
  name: true,
  slug: true,
  visibility: true,
  isSuspended: true,
} satisfies Prisma.CommunitySelect;

const HASHTAG = {
  id: true,
  hashtag: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.PostHashtagSelect;

const MENTION = {
  id: true,
  mentionedUser: {
    select: {
      id: true,
      name: true,
      image: true,
      profile: {
        select: {
          username: true,
          avatar: true,
        },
      },
    },
  },
} satisfies Prisma.PostMentionSelect;

const COUNT = {
  // Normal-display count: eligible top-level comments and eligible direct replies.
  comments: {
    where: DISPLAYABLE_POST_COMMENT_WHERE,
  },
  reactions: true,
  votes: true,
  reposts: true,
  bookmarks: true,
} satisfies Prisma.PostCountOutputTypeSelect;

const ORIGINAL_POST = {
  id: true,
  content: true,
  postType: true,
  visibility: true,
  isDeleted: true,
  createdAt: true,
  author: {
    select: AUTHOR,
  },
  media: {
    select: MEDIA,
  },
  hashtags: {
    select: HASHTAG,
  },
  _count: {
    select: COUNT,
  },
} satisfies Prisma.PostSelect;

const FEED = {
  id: true,
  authorId: true,
  communityId: true,
  repostId: true,
  content: true,
  postType: true,
  visibility: true,
  isEdited: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: AUTHOR,
  },
  community: {
    select: COMMUNITY,
  },
  media: {
    select: MEDIA,
    orderBy: {
      createdAt: "asc",
    },
  },
  hashtags: {
    select: HASHTAG,
  },
  mentions: {
    select: MENTION,
  },
  _count: {
    select: COUNT,
  },
} satisfies Prisma.PostSelect;

export const PostSelect = {
  AUTHOR,
  MEDIA,
  COMMUNITY,
  HASHTAG,
  MENTION,
  COUNT,
  ORIGINAL_POST,
  PUBLIC: FEED,
  FEED,
} as const;

export type TPostPayload = Prisma.PostGetPayload<{
  select: typeof PostSelect.FEED;
}>;

export type TOriginalPostPayload = Prisma.PostGetPayload<{
  select: typeof PostSelect.ORIGINAL_POST;
}>;
