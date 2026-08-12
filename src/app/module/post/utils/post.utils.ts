import { MediaType, PostVisibility } from "../../../../generated/prisma/client";
import type { VoteType } from "../../../../generated/prisma/client";
import type {
  TOriginalPostPayload,
  TPostPayload,
} from "../constants/post.select";
import type { TVoteReadState } from "../../vote/vote.interface";
import type { TAvailableOriginalPost, TPostResponse } from "../post.interface";

export const normalizePostContent = (content?: string | null) => {
  if (typeof content !== "string") {
    return "";
  }

  return content.trim();
};

export const getMediaTypeFromMime = (mimeType: string) => {
  return mimeType === "application/pdf" ? MediaType.FILE : MediaType.IMAGE;
};

const mapAuthor = (
  author: TPostPayload["author"] | TOriginalPostPayload["author"],
) => {
  const profile = author.profile;

  return {
    id: author.id,
    name: author.name,
    username: profile?.username ?? null,
    headline: profile?.headline ?? null,
    avatar: profile?.avatar ?? author.image ?? null,
  };
};

export const mapAvailableOriginalPost = (
  post: TOriginalPostPayload,
): TAvailableOriginalPost => {
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
      voteScore: 0,
      repostsCount: post._count.reposts,
      bookmarksCount: post._count.bookmarks,
    },
    viewerState: {
      vote: null as VoteType | null,
      bookmarked: false,
    },
  };
};

export const mapPost = (post: TPostPayload): TPostResponse => {
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
      voteScore: 0,
      repostsCount: post._count.reposts,
      bookmarksCount: post._count.bookmarks,
    },
    viewerState: {
      vote: null as VoteType | null,
      bookmarked: false,
    },
    originalPost: post.repostId
      ? {
          id: post.repostId,
          unavailable: true as const,
        }
      : null,
  };
};

export const collectPostViewerStateTargetIds = (posts: TPostResponse[]) => {
  const ids = posts.map((post) => post.id);

  for (const post of posts) {
    const originalPost = post.originalPost;

    if (originalPost && !("unavailable" in originalPost)) {
      ids.push(originalPost.id);
    }
  }

  return [...new Set(ids)];
};

export const mergePostBookmarkStates = (
  posts: TPostResponse[],
  bookmarkStates: Map<string, boolean>,
): TPostResponse[] => {
  return posts.map((post) => {
    const originalPost = post.originalPost;
    const enrichedOriginal =
      originalPost && !("unavailable" in originalPost)
        ? {
            ...originalPost,
            viewerState: {
              ...originalPost.viewerState,
              bookmarked: bookmarkStates.get(originalPost.id) ?? false,
            },
          }
        : originalPost;

    return {
      ...post,
      viewerState: {
        ...post.viewerState,
        bookmarked: bookmarkStates.get(post.id) ?? false,
      },
      originalPost: enrichedOriginal,
    };
  });
};

export const mergePostVoteStates = (
  posts: TPostResponse[],
  voteStates: Map<string, TVoteReadState>,
): TPostResponse[] => {
  return posts.map((post) => {
    const state = voteStates.get(post.id);
    const originalPost = post.originalPost;
    const enrichedOriginal =
      originalPost && !("unavailable" in originalPost)
        ? (() => {
            const originalState = voteStates.get(originalPost.id);

            return {
              ...originalPost,
              counts: {
                ...originalPost.counts,
                votesCount:
                  originalState?.votesCount ?? originalPost.counts.votesCount,
                voteScore: originalState?.voteScore ?? 0,
              },
              viewerState: {
                ...originalPost.viewerState,
                vote: originalState?.viewerVote ?? null,
              },
            };
          })()
        : originalPost;

    return {
      ...post,
      counts: {
        ...post.counts,
        votesCount: state?.votesCount ?? post.counts.votesCount,
        voteScore: state?.voteScore ?? 0,
      },
      viewerState: {
        ...post.viewerState,
        vote: state?.viewerVote ?? null,
      },
      originalPost: enrichedOriginal,
    };
  });
};

type TRepostVisibility = Extract<
  PostVisibility,
  "PUBLIC" | "FOLLOWERS" | "PRIVATE"
>;

export const isRepostVisibilityAllowed = (
  visibility: PostVisibility,
): visibility is TRepostVisibility => {
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
} as const satisfies Record<TRepostVisibility, number>;

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
