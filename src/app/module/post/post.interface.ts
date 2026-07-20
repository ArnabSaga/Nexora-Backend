import type {
  MediaType,
  PostType,
  PostVisibility,
} from "../../../generated/prisma/client";

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
};

export type TCreateRepostInput = {
  content?: string;
  visibility?: Extract<PostVisibility, "PUBLIC" | "FOLLOWERS" | "PRIVATE">;
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

export type TPostMentionResponse = {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
};
