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
import {
  collectCommentVoteTargetIds,
  mapComment,
  mapCommentReply,
  mergeCommentActionVoteState,
  mergeCommentVoteStates,
} from "./comment.utils";
import type { TVoteReadService } from "../vote/vote-read.factory";
import {
  createPrismaVoteReadService,
} from "../vote/vote-read.prisma.factory";
import { VoteReadService } from "../vote/vote-read.service";
import type { TCommentActionResponse } from "./comment.interface";

type TPrismaTransaction = Prisma.TransactionClient;

const enrichCommentActionVoteState = async (
  comment: TCommentActionResponse,
  viewerId: string,
  voteReadService: TVoteReadService = VoteReadService,
) => {
  const voteStates = await voteReadService.getCommentVoteStates(
    [comment.id],
    viewerId,
  );

  return mergeCommentActionVoteState(comment, voteStates);
};

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

type TCommentMutationBindings = {
  createVoteReadService: typeof createPrismaVoteReadService;
};

const createCommentMutation = async (
  postId: string,
  requester: Express.AuthenticatedUser,
  payload: TCommentPayload,
  bindings: TCommentMutationBindings,
) => {
  await ensureVisiblePost(postId, requester);

  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.create({
      data: {
        postId,
        authorId: requester.id,
        content: payload.content,
      },
      select: CommentSelect.PUBLIC,
    });

    return enrichCommentActionVoteState(
      mapComment(comment),
      requester.id,
      bindings.createVoteReadService(tx),
    );
  });
};

const createReplyMutation = async (
  commentId: string,
  requester: Express.AuthenticatedUser,
  payload: TCommentPayload,
  bindings: TCommentMutationBindings,
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

  return prisma.$transaction(async (tx) => {
    const reply = await tx.comment.create({
      data: {
        postId: parentComment.postId,
        authorId: requester.id,
        parentCommentId: parentComment.id,
        content: payload.content,
      },
      select: CommentSelect.REPLY,
    });

    return enrichCommentActionVoteState(
      mapCommentReply(reply),
      requester.id,
      bindings.createVoteReadService(tx),
    );
  });
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

  const mappedComments = comments.map(mapComment);
  const voteStates = await VoteReadService.getCommentVoteStates(
    collectCommentVoteTargetIds(mappedComments),
    viewer?.id,
  );

  return {
    data: mergeCommentVoteStates(mappedComments, voteStates),
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

const updateCommentMutation = async (
  id: string,
  requester: Express.AuthenticatedUser,
  payload: TCommentPayload,
  bindings: TCommentMutationBindings,
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

  return prisma.$transaction(async (tx) => {
    const comment = await tx.comment.update({
      where: {
        id: existing.id,
      },
      data: {
        content: payload.content,
        isEdited: true,
      },
      select: CommentSelect.PUBLIC,
    });

    const mappedComment = comment.parentCommentId
      ? mapCommentReply(comment)
      : mapComment(comment);

    return enrichCommentActionVoteState(
      mappedComment,
      requester.id,
      bindings.createVoteReadService(tx),
    );
  });
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

export const createCommentMutationService = (
  bindings: TCommentMutationBindings,
) => ({
  createComment: (
    postId: string,
    requester: Express.AuthenticatedUser,
    payload: TCommentPayload,
  ) => createCommentMutation(postId, requester, payload, bindings),
  createReply: (
    commentId: string,
    requester: Express.AuthenticatedUser,
    payload: TCommentPayload,
  ) => createReplyMutation(commentId, requester, payload, bindings),
  updateComment: (
    id: string,
    requester: Express.AuthenticatedUser,
    payload: TCommentPayload,
  ) => updateCommentMutation(id, requester, payload, bindings),
});

const CommentMutationService = createCommentMutationService({
  createVoteReadService: createPrismaVoteReadService,
});

export const CommentService = {
  createComment: CommentMutationService.createComment,
  createReply: CommentMutationService.createReply,
  getPostComments,
  updateComment: CommentMutationService.updateComment,
  deleteComment,
};
