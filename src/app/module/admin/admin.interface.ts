import type {
  CommunityVisibility,
  MediaType,
  PostType,
  PostVisibility,
  UserRole,
  UserStatus,
} from "../../../generated/prisma/client";
import type { TMeta } from "../../shared/response/response.types";
import type {
  ADMIN_COMMUNITY_STATES,
  ADMIN_COMMUNITY_STATUSES,
  ADMIN_POST_STATES,
} from "./admin.constant";

export type TAdminPostState = (typeof ADMIN_POST_STATES)[number];
export type TAdminCommunityState = (typeof ADMIN_COMMUNITY_STATES)[number];
export type TAdminCommunityStatus = (typeof ADMIN_COMMUNITY_STATUSES)[number];

export type TAdminPostQuery = {
  page?: number;
  limit?: number;
  searchTerm?: string;
  authorId?: string;
  communityId?: string;
  visibility?: PostVisibility;
  state?: TAdminPostState;
};

export type TAdminCommunityQuery = {
  page?: number;
  limit?: number;
  searchTerm?: string;
  ownerId?: string;
  visibility?: CommunityVisibility;
  state?: TAdminCommunityState;
};

export type TNormalizedAdminPostQuery = Required<
  Pick<TAdminPostQuery, "page" | "limit">
> &
  Omit<TAdminPostQuery, "page" | "limit"> & {
    patternSearchTerm?: string;
  };

export type TNormalizedAdminCommunityQuery = Required<
  Pick<TAdminCommunityQuery, "page" | "limit">
> &
  Omit<TAdminCommunityQuery, "page" | "limit"> & {
    patternSearchTerm?: string;
  };

export type TAdminUserSummary = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  role: UserRole;
  status: UserStatus;
  deletedAt: Date | null;
};

export type TAdminCommunitySummary = {
  id: string;
  name: string;
  slug: string;
  visibility: CommunityVisibility;
  isSuspended: boolean;
  deletedAt: Date | null;
};

export type TAdminPost = {
  id: string;
  authorId: string;
  communityId: string | null;
  parentPostId: string | null;
  repostId: string | null;
  content: string;
  postType: PostType;
  visibility: PostVisibility;
  isEdited: boolean;
  isDeleted: boolean;
  author: TAdminUserSummary;
  community: TAdminCommunitySummary | null;
  media: Array<{
    id: string;
    url: string;
    mediaType: MediaType;
    publicId: string | null;
    createdAt: Date;
  }>;
  hashtags: Array<{ id: string; name: string }>;
  counts: {
    comments: number;
    reactions: number;
    votes: number;
    bookmarks: number;
    reports: number;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type TAdminCommunity = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string | null;
  avatar: string | null;
  coverPhoto: string | null;
  visibility: CommunityVisibility;
  isSuspended: boolean;
  deletedAt: Date | null;
  owner: TAdminUserSummary;
  counts: {
    members: number;
    posts: number;
    reports: number;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type TAdminDashboard = {
  users: { total: number; active: number; suspended: number; deleted: number };
  posts: { total: number; active: number; deleted: number };
  communities: {
    total: number;
    active: number;
    suspended: number;
    deleted: number;
  };
  reports: {
    total: number;
    pending: number;
    reviewed: number;
    resolved: number;
    rejected: number;
  };
};

export type TAdminListResult<T> = { data: T[]; meta: TMeta };

export type TAdminReader = {
  getDashboard(): Promise<TAdminDashboard>;
  getPosts(
    query: TNormalizedAdminPostQuery,
  ): Promise<TAdminListResult<TAdminPost>>;
  getCommunities(
    query: TNormalizedAdminCommunityQuery,
  ): Promise<TAdminListResult<TAdminCommunity>>;
};

export type TAdminCommunityStatusPayload = { status: TAdminCommunityStatus };
export type TAdminCommunityStatusResponse = {
  id: string;
  status: TAdminCommunityStatus;
  updatedAt: Date;
};
