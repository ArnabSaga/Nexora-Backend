import type { Prisma } from "../../../generated/prisma/client";
import type {
  TAdminCommunity,
  TAdminPost,
  TAdminUserSummary,
} from "./admin.interface";
import type { TAdminCommunityPayload, TAdminPostPayload } from "./admin.select";

type TAdminUserPayload = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    role: true;
    status: true;
    deletedAt: true;
    profile: { select: { username: true; avatar: true } };
  };
}>;

export const mapAdminUserSummary = (
  user: TAdminUserPayload,
): TAdminUserSummary => ({
  id: user.id,
  name: user.name,
  username: user.profile?.username ?? user.id,
  avatar: user.profile?.avatar ?? null,
  role: user.role,
  status: user.status,
  deletedAt: user.deletedAt,
});

export const mapAdminPost = (post: TAdminPostPayload): TAdminPost => ({
  id: post.id,
  authorId: post.authorId,
  communityId: post.communityId,
  parentPostId: post.parentPostId,
  repostId: post.repostId,
  content: post.content,
  postType: post.postType,
  visibility: post.visibility,
  isEdited: post.isEdited,
  isDeleted: post.isDeleted,
  author: mapAdminUserSummary(post.author),
  community: post.community
    ? {
        id: post.community.id,
        name: post.community.name,
        slug: post.community.slug,
        visibility: post.community.visibility,
        isSuspended: post.community.isSuspended,
        deletedAt: post.community.deletedAt,
      }
    : null,
  media: post.media,
  hashtags: post.hashtags.map(({ hashtag }) => hashtag),
  counts: {
    comments: post._count.comments,
    reactions: post._count.reactions,
    votes: post._count.votes,
    bookmarks: post._count.bookmarks,
    reports: post._count.reports,
  },
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
});

export const mapAdminCommunity = (
  community: TAdminCommunityPayload,
): TAdminCommunity => ({
  id: community.id,
  ownerId: community.ownerId,
  name: community.name,
  slug: community.slug,
  description: community.description,
  avatar: community.avatar,
  coverPhoto: community.coverPhoto,
  visibility: community.visibility,
  isSuspended: community.isSuspended,
  deletedAt: community.deletedAt,
  owner: mapAdminUserSummary(community.owner),
  counts: {
    members: community._count.members,
    posts: community._count.posts,
    reports: community._count.reports,
  },
  createdAt: community.createdAt,
  updatedAt: community.updatedAt,
});
