import status from "http-status";
import {
  CommunityMemberRole,
  CommunityMemberStatus,
  Prisma,
  UserRole,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import { paginationHelper } from "../../shared/helpers/paginationHelper";
import { ELIGIBLE_COMMENT_WHERE } from "../../shared/policies/comment.policy";
import { PostVisibilityService } from "../post/services/post-visibility.service";
import {
  COMMENT_DEFAULT_LIMIT,
  COMMENT_MAX_LIMIT,
} from "./comment.constant";
import {
  TCommentListQuery,
  TCommentPayload,
} from "./comment.interface";
import { CommentSelect } from "./comment.select";
import { mapComment, mapCommentReply } from "./comment.utils";

type TPrismaTransaction = Prisma.TransactionClient;

const ensureVisiblePost = async (
  postId: string,
  viewer?: Express.AuthenticatedUser,
) => {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      ...PostVisibilityService.buildVisiblePostWhere(viewer),
    },
    select: {
      id: true,
    },
  });

  if (!post) {
    throw new AppError(status.NOT_FOUND, "Post not found");
  }

  return post;
};

const createComment = async (
  postId: string,
  requester: Express.AuthenticatedUser,
  payload: TCommentPayload,
) => {
  await ensureVisiblePost(postId, requester);

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId: requester.id,
      content: payload.content,
    },
    select: CommentSelect.PUBLIC,
  });

  return mapComment(comment);
};

const createReply = async (
  commentId: string,
  requester: Express.AuthenticatedUser,
  payload: TCommentPayload,
) => {
  const parentComment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      ...ELIGIBLE_COMMENT_WHERE,
      post: {
        is: PostVisibilityService.buildVisiblePostWhere(requester),
      },
    },
    select: {
      id: true,
      postId: true,
      parentCommentId: true,
    },
  });

  if (!parentComment) {
    throw new AppError(status.NOT_FOUND, "Comment not found");
  }

  if (parentComment.parentCommentId !== null) {
    throw new AppError(
      status.BAD_REQUEST,
      "Replies can only be added to top-level comments",
    );
  }

  const reply = await prisma.comment.create({
    data: {
      postId: parentComment.postId,
      authorId: requester.id,
      parentCommentId: parentComment.id,
      content: payload.content,
    },
    select: CommentSelect.REPLY,
  });

  return mapCommentReply(reply);
};

const getPostComments = async (
  postId: string,
  query: TCommentListQuery,
  viewer?: Express.AuthenticatedUser,
) => {
  await ensureVisiblePost(postId, viewer);

  const pagination = paginationHelper.calculatePagination(query, {
    defaultLimit: COMMENT_DEFAULT_LIMIT,
    maxLimit: COMMENT_MAX_LIMIT,
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });

  const where = {
    postId,
    parentCommentId: null,
    ...ELIGIBLE_COMMENT_WHERE,
  } satisfies Prisma.CommentWhereInput;

  const [comments, total] = await prisma.$transaction([
    prisma.comment.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      select: CommentSelect.PUBLIC,
    }),
    prisma.comment.count({
      where,
    }),
  ]);

  return {
    data: comments.map(mapComment),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

const updateComment = async (
  id: string,
  requester: Express.AuthenticatedUser,
  payload: TCommentPayload,
) => {
  const existing = await prisma.comment.findFirst({
    where: {
      id,
      authorId: requester.id,
      isDeleted: false,
      post: {
        is: PostVisibilityService.buildVisiblePostWhere(requester),
      },
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Comment not found");
  }

  const comment = await prisma.comment.update({
    where: {
      id: existing.id,
    },
    data: {
      content: payload.content,
      isEdited: true,
    },
    select: CommentSelect.PUBLIC,
  });

  return comment.parentCommentId ? mapCommentReply(comment) : mapComment(comment);
};

const resolveAdminDeleteAuthority = async (
  tx: TPrismaTransaction,
  commentId: string,
  requester: Express.AuthenticatedUser,
) => {
  if (
    requester.role !== UserRole.ADMIN &&
    requester.role !== UserRole.SUPER_ADMIN
  ) {
    return null;
  }

  return tx.comment.findUnique({
    where: {
      id: commentId,
    },
    select: {
      id: true,
    },
  });
};

const resolveOwnerDeleteAuthority = async (
  tx: TPrismaTransaction,
  commentId: string,
  requester: Express.AuthenticatedUser,
) => {
  return tx.comment.findFirst({
    where: {
      id: commentId,
      authorId: requester.id,
    },
    select: {
      id: true,
    },
  });
};

const resolveCommunityDeleteAuthority = async (
  tx: TPrismaTransaction,
  commentId: string,
  requester: Express.AuthenticatedUser,
) => {
  return tx.comment.findFirst({
    where: {
      id: commentId,
      post: {
        is: {
          community: {
            is: {
              isSuspended: false,
              OR: [
                {
                  ownerId: requester.id,
                },
                {
                  members: {
                    some: {
                      userId: requester.id,
                      status: CommunityMemberStatus.ACTIVE,
                      role: {
                        in: [
                          CommunityMemberRole.OWNER,
                          CommunityMemberRole.ADMIN,
                          CommunityMemberRole.MODERATOR,
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
    select: {
      id: true,
    },
  });
};

const resolveDeleteAuthority = async (
  tx: TPrismaTransaction,
  commentId: string,
  requester: Express.AuthenticatedUser,
) => {
  const adminComment = await resolveAdminDeleteAuthority(tx, commentId, requester);

  if (adminComment) {
    return adminComment;
  }

  const ownerComment = await resolveOwnerDeleteAuthority(tx, commentId, requester);

  if (ownerComment) {
    return ownerComment;
  }

  return resolveCommunityDeleteAuthority(tx, commentId, requester);
};

const deleteComment = async (
  id: string,
  requester: Express.AuthenticatedUser,
) => {
  await prisma.$transaction(async (tx) => {
    const authorizedComment = await resolveDeleteAuthority(tx, id, requester);

    if (!authorizedComment) {
      throw new AppError(status.NOT_FOUND, "Comment not found");
    }

    await tx.comment.updateMany({
      where: {
        id: authorizedComment.id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });
  });

  return null;
};

export const CommentService = {
  createComment,
  createReply,
  getPostComments,
  updateComment,
  deleteComment,
};
