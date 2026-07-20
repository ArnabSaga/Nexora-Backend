import status from "http-status";
import {
  CommunityMemberStatus,
  CommunityVisibility,
  PostType,
  PostVisibility,
  Prisma,
  UserRole,
} from "../../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";
import AppError from "../../../shared/errors/AppError";
import { HashtagService } from "./hashtag.service";
import { MentionService } from "./mention.service";
import { PostMediaService } from "./post-media.service";
import { PostVisibilityService } from "./post-visibility.service";
import {
  TCreatePostInput,
  TCreateRepostInput,
  TUpdatePostInput,
  TUploadedPostMedia,
} from "../post.interface";
import { PostSelect } from "../constants/post.select";
import {
  isRepostVisibilityAllowed,
  isRepostVisibilityNarrowEnough,
  mapPost,
  normalizePostContent,
} from "../utils/post.utils";

const validateAuthorCanPostInCommunity = async (
  authorId: string,
  communityId?: string,
) => {
  if (!communityId) {
    return null;
  }

  const community = await prisma.community.findUnique({
    where: {
      id: communityId,
    },
    select: {
      id: true,
      ownerId: true,
      isSuspended: true,
      members: {
        where: {
          userId: authorId,
          status: CommunityMemberStatus.ACTIVE,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!community || community.isSuspended) {
    throw new AppError(status.NOT_FOUND, "Community not found");
  }

  if (community.ownerId !== authorId && community.members.length === 0) {
    throw new AppError(status.FORBIDDEN, "You cannot post in this community");
  }

  return community;
};

const ensureValidWriteVisibility = (
  visibility: PostVisibility,
  communityId?: string | null,
) => {
  if (visibility === PostVisibility.COMMUNITY_ONLY && !communityId) {
    throw new AppError(
      status.BAD_REQUEST,
      "COMMUNITY_ONLY visibility is valid only for posts that already belong to a community",
    );
  }
};

const createMediaRows = (
  media: TUploadedPostMedia[],
): Prisma.PostMediaCreateWithoutPostInput[] => {
  return media.map((item) => ({
    url: item.url,
    publicId: item.publicId,
    mediaType: item.mediaType,
  }));
};

const validateMentionsBeforeUpload = async (mentionedUserIds: string[] = []) => {
  const uniqueIds = MentionService.dedupeMentionedUserIds(mentionedUserIds);

  if (!uniqueIds.length) {
    return uniqueIds;
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: uniqueIds,
      },
      status: "ACTIVE",
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (users.length !== uniqueIds.length) {
    throw new AppError(status.BAD_REQUEST, "One or more mentioned users are invalid");
  }

  return uniqueIds;
};

const create = async (
  author: Express.AuthenticatedUser,
  payload: TCreatePostInput,
  files: Express.Multer.File[] = [],
) => {
  PostMediaService.validateFiles(files);

  const content = normalizePostContent(payload.content);
  const postType = payload.postType ?? PostType.SHORT;
  const visibility = payload.visibility ?? PostVisibility.PUBLIC;
  const mentionedUserIds = await validateMentionsBeforeUpload(
    payload.mentionedUserIds,
  );

  ensureValidWriteVisibility(visibility, payload.communityId);

  if (!content && files.length === 0) {
    throw new AppError(status.BAD_REQUEST, "Post content or media is required");
  }

  await validateAuthorCanPostInCommunity(author.id, payload.communityId);

  const uploadedMedia = await PostMediaService.uploadFiles(files);

  try {
    const post = await prisma.$transaction(async (tx) => {
      const createdPost = await tx.post.create({
        data: {
          authorId: author.id,
          communityId: payload.communityId ?? null,
          content,
          postType,
          visibility,
          media: {
            create: createMediaRows(uploadedMedia),
          },
        },
        select: {
          id: true,
        },
      });

      await HashtagService.syncPostHashtags(tx, createdPost.id, content);
      await MentionService.syncPostMentions(tx, createdPost.id, mentionedUserIds);

      return tx.post.findUniqueOrThrow({
        where: {
          id: createdPost.id,
        },
        select: PostSelect.FEED,
      });
    });

    return mapPost(post);
  } catch (error) {
    await PostMediaService.safeCleanupUploadedMedia(
      uploadedMedia,
      "create-post-transaction-failed",
    );
    throw error;
  }
};

const getById = async (id: string, viewer?: Express.AuthenticatedUser) => {
  const post = await prisma.post.findFirst({
    where: {
      id,
      ...PostVisibilityService.buildVisiblePostWhere(viewer),
    },
    select: PostSelect.FEED,
  });

  if (!post) {
    throw new AppError(status.NOT_FOUND, "Post not found");
  }

  return mapPost(post);
};

const update = async (
  id: string,
  author: Express.AuthenticatedUser,
  payload: TUpdatePostInput,
) => {
  const existing = await prisma.post.findFirst({
    where: {
      id,
      authorId: author.id,
      isDeleted: false,
    },
    select: {
      id: true,
      content: true,
      communityId: true,
      visibility: true,
    },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Post not found");
  }

  const content =
    payload.content !== undefined
      ? normalizePostContent(payload.content)
      : existing.content;
  const visibility = payload.visibility ?? existing.visibility;

  ensureValidWriteVisibility(visibility, existing.communityId);

  if (!content) {
    const mediaCount = await prisma.postMedia.count({
      where: {
        postId: id,
      },
    });

    if (mediaCount === 0) {
      throw new AppError(status.BAD_REQUEST, "Post content or media is required");
    }
  }

  const post = await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: {
        id,
      },
      data: {
        ...(payload.content !== undefined && { content }),
        ...(payload.visibility !== undefined && { visibility }),
        isEdited: true,
      },
    });

    if (payload.content !== undefined) {
      await HashtagService.syncPostHashtags(tx, id, content);
    }

    return tx.post.findUniqueOrThrow({
      where: {
        id,
      },
      select: PostSelect.FEED,
    });
  });

  return mapPost(post);
};

const remove = async (id: string, requester: Express.AuthenticatedUser) => {
  const isAdmin =
    requester.role === UserRole.ADMIN || requester.role === UserRole.SUPER_ADMIN;

  const post = isAdmin
    ? await prisma.post.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
        },
      })
    : await prisma.post.findFirst({
        where: {
          id,
          authorId: requester.id,
        },
        select: {
          id: true,
        },
      });

  if (!post) {
    throw new AppError(status.NOT_FOUND, "Post not found");
  }

  await prisma.$transaction(async (tx) => {
    const result = await tx.post.updateMany({
      where: {
        id: post.id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
      },
    });

    if (result.count === 1) {
      await HashtagService.decrementPostHashtags(tx, post.id);
    }
  });

  return null;
};

const assertRepostSourceCanBeReposted = (source: {
  visibility: PostVisibility;
  community: {
    visibility: CommunityVisibility;
  } | null;
}) => {
  if (source.visibility === PostVisibility.COMMUNITY_ONLY) {
    throw new AppError(status.FORBIDDEN, "This post cannot be reposted");
  }

  if (
    source.community &&
    source.community.visibility !== CommunityVisibility.PUBLIC
  ) {
    throw new AppError(status.FORBIDDEN, "This post cannot be reposted");
  }
};

const repost = async (
  sourcePostId: string,
  author: Express.AuthenticatedUser,
  payload: TCreateRepostInput,
) => {
  const sourcePost = await prisma.post.findFirst({
    where: {
      id: sourcePostId,
      ...PostVisibilityService.buildVisiblePostWhere(author),
    },
    select: {
      id: true,
      repostId: true,
      visibility: true,
      community: {
        select: {
          visibility: true,
        },
      },
    },
  });

  if (!sourcePost) {
    throw new AppError(status.NOT_FOUND, "Post not found");
  }

  assertRepostSourceCanBeReposted(sourcePost);

  const originalId = sourcePost.repostId ?? sourcePost.id;
  const visibility = payload.visibility ?? PostVisibility.PUBLIC;

  if (!isRepostVisibilityAllowed(visibility)) {
    throw new AppError(status.BAD_REQUEST, "Invalid repost visibility");
  }

  if (!isRepostVisibilityNarrowEnough(sourcePost.visibility, visibility)) {
    throw new AppError(
      status.BAD_REQUEST,
      "Repost visibility cannot be broader than the original post visibility",
    );
  }

  const content = normalizePostContent(payload.content);

  const post = await prisma.$transaction(async (tx) => {
    const createdPost = await tx.post.create({
      data: {
        authorId: author.id,
        repostId: originalId,
        content,
        postType: PostType.SHORT,
        visibility,
      },
      select: {
        id: true,
      },
    });

    await HashtagService.syncPostHashtags(tx, createdPost.id, content);

    return tx.post.findUniqueOrThrow({
      where: {
        id: createdPost.id,
      },
      select: PostSelect.FEED,
    });
  });

  return mapPost(post);
};

export const PostService = {
  create,
  getById,
  update,
  delete: remove,
  repost,
};
