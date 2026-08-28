import type {
  TCommentPublicPayload,
  TCommentReplyPayload,
} from "./comment.select";
import type {
  TCommentActionResponse,
  TCommentResponse,
  TCommentReplyResponse,
} from "./comment.interface";
import type { TVoteReadState } from "../vote/vote.interface";
import { mapMentionResponse } from "../mention";

const mapAuthor = (
  author: TCommentPublicPayload["author"] | TCommentReplyPayload["author"],
) => {
  return {
    id: author.id,
    name: author.name,
    username: author.profile?.username ?? null,
    headline: author.profile?.headline ?? null,
    avatar: author.profile?.avatar ?? author.image ?? null,
  };
};

export const mapCommentReply = (
  comment: TCommentReplyPayload,
): TCommentReplyResponse => {
  return {
    id: comment.id,
    content: comment.content,
    isEdited: comment.isEdited,
    parentCommentId: comment.parentCommentId!,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: mapAuthor(comment.author),
    mentions: comment.mentions.map(mapMentionResponse),
    counts: {
      reactions: comment._count.reactions,
      votes: comment._count.votes,
      voteScore: 0,
    },
    viewerState: {
      vote: null,
    },
  };
};

export const mapComment = (
  comment: TCommentPublicPayload,
): TCommentResponse => {
  return {
    id: comment.id,
    content: comment.content,
    isEdited: comment.isEdited,
    parentCommentId: null,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: mapAuthor(comment.author),
    mentions: comment.mentions.map(mapMentionResponse),
    counts: {
      replies: comment._count.replies,
      reactions: comment._count.reactions,
      votes: comment._count.votes,
      voteScore: 0,
    },
    viewerState: {
      vote: null,
    },
    replies: comment.replies.map(mapCommentReply),
  };
};

const mergeReplyVoteState = (
  reply: TCommentReplyResponse,
  voteStates: Map<string, TVoteReadState>,
): TCommentReplyResponse => {
  const state = voteStates.get(reply.id);

  return {
    ...reply,
    counts: {
      ...reply.counts,
      votes: state?.votesCount ?? reply.counts.votes,
      voteScore: state?.voteScore ?? 0,
    },
    viewerState: {
      ...reply.viewerState,
      vote: state?.viewerVote ?? null,
    },
  };
};

const mergeTopLevelVoteState = (
  comment: TCommentResponse,
  voteStates: Map<string, TVoteReadState>,
): TCommentResponse => {
  const state = voteStates.get(comment.id);

  return {
    ...comment,
    counts: {
      ...comment.counts,
      votes: state?.votesCount ?? comment.counts.votes,
      voteScore: state?.voteScore ?? 0,
    },
    viewerState: {
      ...comment.viewerState,
      vote: state?.viewerVote ?? null,
    },
    replies: comment.replies.map((reply) =>
      mergeReplyVoteState(reply, voteStates),
    ),
  };
};

export const collectCommentVoteTargetIds = (comments: TCommentResponse[]) => {
  return [
    ...new Set(
      comments.flatMap((comment) => [
        comment.id,
        ...comment.replies.map((reply) => reply.id),
      ]),
    ),
  ];
};

export const mergeCommentVoteStates = (
  comments: TCommentResponse[],
  voteStates: Map<string, TVoteReadState>,
) => {
  return comments.map((comment) => mergeTopLevelVoteState(comment, voteStates));
};

export const mergeCommentActionVoteState = (
  comment: TCommentActionResponse,
  voteStates: Map<string, TVoteReadState>,
): TCommentActionResponse => {
  return comment.parentCommentId === null
    ? mergeTopLevelVoteState(comment, voteStates)
    : mergeReplyVoteState(comment, voteStates);
};
