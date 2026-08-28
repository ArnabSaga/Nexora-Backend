import type { Prisma } from "../../../generated/prisma/client";

export const ADMIN_USER_SUMMARY_SELECT = {
  id: true,
  name: true,
  role: true,
  status: true,
  deletedAt: true,
  profile: {
    select: {
      username: true,
      avatar: true,
    },
  },
} satisfies Prisma.UserSelect;

export const ADMIN_POST_SELECT = {
  id: true,
  authorId: true,
  communityId: true,
  parentPostId: true,
  repostId: true,
  content: true,
  postType: true,
  visibility: true,
  isEdited: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
  author: { select: ADMIN_USER_SUMMARY_SELECT },
  community: {
    select: {
      id: true,
      name: true,
      slug: true,
      visibility: true,
      isSuspended: true,
      deletedAt: true,
    },
  },
  media: {
    select: {
      id: true,
      url: true,
      mediaType: true,
      publicId: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  hashtags: {
    select: {
      id: true,
      hashtag: { select: { id: true, name: true } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  _count: {
    select: {
      comments: true,
      reactions: true,
      votes: true,
      bookmarks: true,
      reports: true,
    },
  },
} satisfies Prisma.PostSelect;

export const ADMIN_COMMUNITY_SELECT = {
  id: true,
  ownerId: true,
  name: true,
  slug: true,
  description: true,
  avatar: true,
  coverPhoto: true,
  visibility: true,
  isSuspended: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: ADMIN_USER_SUMMARY_SELECT },
  _count: {
    select: {
      members: true,
      posts: true,
      reports: true,
    },
  },
} satisfies Prisma.CommunitySelect;

export type TAdminPostPayload = Prisma.PostGetPayload<{
  select: typeof ADMIN_POST_SELECT;
}>;
export type TAdminCommunityPayload = Prisma.CommunityGetPayload<{
  select: typeof ADMIN_COMMUNITY_SELECT;
}>;
