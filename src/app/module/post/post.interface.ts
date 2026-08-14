import type {
  CommunityVisibility,
  MediaType,
  PostType,
  PostVisibility,
  VoteType,
} from "../../../generated/prisma/client";
import type { TMentionResponse } from "../mention";

export type TCreatePostInput = {
  content?: string;
  postType?: Exclude<PostType, "POLL">;
  visibility?: PostVisibility;
  communityId?: string;
  mentionedUserIds?: string[];
};

export type TUpdatePostInput = {
  content?: string;
  visibility?: PostVisibility;
  mentionedUserIds?: string[];
};

export type TCreateRepostInput = {
  content?: string;
  visibility?: Extract<PostVisibility, "PUBLIC" | "FOLLOWERS" | "PRIVATE">;
  mentionedUserIds?: string[];
};

export type TPostListQuery = {
  page?: number;
  limit?: number;
};

export type TPostFeedQuery = {
  cursor?: string;
  limit?: number;
};

export type TUploadedPostMedia = {
  url: string;
  publicId: string;
  resourceType: string;
  mediaType: MediaType;
};

export type TPostCursorPayload = {
  version: 1;
  createdAt: string;
  id: string;
};

export type TCursorMeta = {
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
};

export type TPostAuthorResponse = {
  id: string;
  name: string;
  username: string | null;
  headline: string | null;
  avatar: string | null;
};

export type TPostMediaResponse = {
  id: string;
  url: string;
  mediaType: MediaType;
};

export type TPostHashtagResponse = {
  id: string;
  name: string;
};

export type TPostCountsResponse = {
  commentsCount: number;
  reactionsCount: number;
  votesCount: number;
  voteScore: number;
  repostsCount: number;
  bookmarksCount: number;
};

export type TPostViewerState = {
  vote: VoteType | null;
  bookmarked: boolean;
};

export type TUnavailableOriginalPost = {
  id: string;
  unavailable: true;
};

export type TAvailableOriginalPost = {
  id: string;
  content: string;
  postType: PostType;
  visibility: PostVisibility;
  createdAt: Date;
  author: TPostAuthorResponse;
  media: TPostMediaResponse[];
  hashtags: TPostHashtagResponse[];
  counts: TPostCountsResponse;
  viewerState: TPostViewerState;
};

export type TOriginalPostResponse =
  | TAvailableOriginalPost
  | TUnavailableOriginalPost;

export type TPostResponse = {
  id: string;
  content: string;
  postType: PostType;
  visibility: PostVisibility;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: TPostAuthorResponse;
  community: {
    id: string;
    name: string;
    slug: string;
    visibility: CommunityVisibility;
  } | null;
  media: TPostMediaResponse[];
  hashtags: TPostHashtagResponse[];
  mentions: TMentionResponse[];
  counts: TPostCountsResponse;
  viewerState: TPostViewerState;
  originalPost: TOriginalPostResponse | null;
};
