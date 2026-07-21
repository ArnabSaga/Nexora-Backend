import {
  TCommentPublicPayload,
  TCommentReplyPayload,
} from "./comment.select";

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

export const mapCommentReply = (comment: TCommentReplyPayload) => {
  return {
    id: comment.id,
    content: comment.content,
    isEdited: comment.isEdited,
    parentCommentId: comment.parentCommentId!,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: mapAuthor(comment.author),
    counts: {
      reactions: comment._count.reactions,
      votes: comment._count.votes,
    },
  };
};

export const mapComment = (comment: TCommentPublicPayload) => {
  return {
    id: comment.id,
    content: comment.content,
    isEdited: comment.isEdited,
    parentCommentId: null,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: mapAuthor(comment.author),
    counts: {
      replies: comment._count.replies,
      reactions: comment._count.reactions,
      votes: comment._count.votes,
    },
    replies: comment.replies.map(mapCommentReply),
  };
};
