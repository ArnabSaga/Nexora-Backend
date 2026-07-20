import { MediaType, PostVisibility } from "../../../../generated/prisma/client";
import { TPostPayload } from "../constants/post.select";

export const normalizePostContent = (content?: string | null) => {
  if (typeof content !== "string") {
    return "";
  }

  return content.trim();
};

export const getMediaTypeFromMime = (mimeType: string) => {
  return mimeType === "application/pdf" ? MediaType.FILE : MediaType.IMAGE;
};

const mapAuthor = (author: TPostPayload["author"]) => {
  const profile = author.profile;

  return {
    id: author.id,
    name: author.name,
    username: profile?.username ?? null,
    headline: profile?.headline ?? null,
    avatar: profile?.avatar ?? author.image ?? null,
  };
};

const mapOriginalPost = (post: TPostPayload["repostOf"]) => {
  if (!post) {
    return null;
  }

  if (post.isDeleted) {
    return {
      id: post.id,
      unavailable: true,
    };
  }

  return {
    id: post.id,
    content: post.content,
    postType: post.postType,
    visibility: post.visibility,
    createdAt: post.createdAt,
    author: mapAuthor(post.author),
    media: post.media.map((media) => ({
      id: media.id,
      url: media.url,
      mediaType: media.mediaType,
    })),
    hashtags: post.hashtags.map((item) => item.hashtag),
    counts: {
      commentsCount: post._count.comments,
      reactionsCount: post._count.reactions,
      votesCount: post._count.votes,
      repostsCount: post._count.reposts,
      bookmarksCount: post._count.bookmarks,
    },
  };
};

export const mapPost = (post: TPostPayload) => {
  return {
    id: post.id,
    content: post.content,
    postType: post.postType,
    visibility: post.visibility,
    isEdited: post.isEdited,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: mapAuthor(post.author),
    community: post.community
      ? {
          id: post.community.id,
          name: post.community.name,
          slug: post.community.slug,
          visibility: post.community.visibility,
        }
      : null,
    media: post.media.map((media) => ({
      id: media.id,
      url: media.url,
      mediaType: media.mediaType,
    })),
    hashtags: post.hashtags.map((item) => item.hashtag),
    mentions: post.mentions.map((mention) => ({
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
    })),
    counts: {
      commentsCount: post._count.comments,
      reactionsCount: post._count.reactions,
      votesCount: post._count.votes,
      repostsCount: post._count.reposts,
      bookmarksCount: post._count.bookmarks,
    },
    originalPost: mapOriginalPost(post.repostOf),
  };
};

export const isRepostVisibilityAllowed = (visibility: PostVisibility) => {
  return (
    visibility === PostVisibility.PUBLIC ||
    visibility === PostVisibility.FOLLOWERS ||
    visibility === PostVisibility.PRIVATE
  );
};

const repostVisibilityRank = {
  [PostVisibility.PUBLIC]: 3,
  [PostVisibility.FOLLOWERS]: 2,
  [PostVisibility.PRIVATE]: 1,
} as const;

export const isRepostVisibilityNarrowEnough = (
  sourceVisibility: PostVisibility,
  targetVisibility: PostVisibility,
) => {
  if (
    !isRepostVisibilityAllowed(sourceVisibility) ||
    !isRepostVisibilityAllowed(targetVisibility)
  ) {
    return false;
  }

  return (
    repostVisibilityRank[targetVisibility] <=
    repostVisibilityRank[sourceVisibility]
  );
};
