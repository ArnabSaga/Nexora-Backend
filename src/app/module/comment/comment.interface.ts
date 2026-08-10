import { TMeta } from "../../shared/response/response.types";
import type { VoteType } from "../../../generated/prisma/client";

export type TCommentPayload = {
  content: string;
};

export type TCommentListQuery = {
  page?: number;
  limit?: number;
};

export type TCommentAuthor = {
  id: string;
  name: string;
  username: string | null;
  headline: string | null;
  avatar: string | null;
};

export type TCommentReplyResponse = {
  id: string;
  content: string;
  isEdited: boolean;
  parentCommentId: string;
  createdAt: Date;
  updatedAt: Date;
  author: TCommentAuthor;
  counts: {
    reactions: number;
    votes: number;
    voteScore: number;
  };
  viewerState: {
    vote: VoteType | null;
  };
};

export type TCommentResponse = {
  id: string;
  content: string;
  isEdited: boolean;
  parentCommentId: null;
  createdAt: Date;
  updatedAt: Date;
  author: TCommentAuthor;
  counts: {
    replies: number;
    reactions: number;
    votes: number;
    voteScore: number;
  };
  viewerState: {
    vote: VoteType | null;
  };
  replies: TCommentReplyResponse[];
};

export type TCommentActionResponse = TCommentResponse | TCommentReplyResponse;

export type TPaginatedComments = {
  data: TCommentResponse[];
  meta: TMeta;
};
