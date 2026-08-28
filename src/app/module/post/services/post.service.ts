import status from "http-status";
import {
  CommunityVisibility,
  NotificationType,
  PostType,
  PostVisibility,
  Prisma,
} from "../../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";
import AppError from "../../../shared/errors/AppError";
import { buildAvailableParticipationWhere } from "../../../shared/policies/community.policy";
import { createPrismaHashtagWriter } from "../../../shared/hashtags/hashtag-write.prisma.factory";
import {
  buildPostMentionEvents,
  MentionService,
  type TMentionWriterFactory,
} from "../../mention";
import {
  buildCommunityModerationWhere,
  hasGlobalContentModerationAuthority,
} from "../../moderation";
import { UploadService, type TUploadService } from "../../upload";
import { PostVisibilityService } from "./post-visibility.service";
import { createPrismaNotificationWriter } from "../../../shared/notifications/notification-writer.prisma.factory";
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
  normalizePostContent,
} from "../utils/post.utils";
import {
  createPrismaPostResponseService,
  PostResponseService,
} from "./post-response.service";

type TPostMutationBindings = {
  createPostResponseService: typeof createPrismaPostResponseService;
  createNotificationWriter?: typeof createPrismaNotificationWriter;
  mentionWriterFactory?: TMentionWriterFactory;
  mediaService: Pick<
    TUploadService,
    "validatePostMedia" | "uploadPostMedia" | "safeCleanupUploadedAssets"
  >;
};

const createTransactionMentionWriter = (
  bindings: TPostMutationBindings,
  client: Prisma.TransactionClient,
) =>
  (
    bindings.mentionWriterFactory ??
    ((mentionClient) => MentionService.forClient(mentionClient))
  )(client);

const validateAuthorCanPostInCommunity = async (
  authorId: string,
  communityId?: string,
) => {
  if (!communityId) {
    return null;
  }

  const community = await prisma.community.findFirst({
    where: {
      id: communityId,
      ...buildAvailableParticipationWhere(authorId),
    },
    select: {
      id: true,
    },
  });

  if (!community) {
    throw new AppError(status.NOT_FOUND, "Community not found");
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

const createMutation = async (
  author: Express.AuthenticatedUser,
  payload: TCreatePostInput,
  files: Express.Multer.File[] = [],
  bindings: TPostMutationBindings,
) => {
  bindings.mediaService.validatePostMedia(files);

  const content = normalizePostContent(payload.content);
  const postType = payload.postType ?? PostType.SHORT;
  const visibility = payload.visibility ?? PostVisibility.PUBLIC;
  const mentionedUserIds = MentionService.normalize(
    payload.mentionedUserIds ?? [],
  );
  await MentionService.validateUsers(mentionedUserIds);

  ensureValidWriteVisibility(visibility, payload.communityId);

  if (!content && files.length === 0) {
    throw new AppError(status.BAD_REQUEST, "Post content or media is required");
  }

  await validateAuthorCanPostInCommunity(author.id, payload.communityId);

  const uploadedMedia = await bindings.mediaService.uploadPostMedia(files);

  try {
    const response = await prisma.$transaction(async (tx) => {
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

      await createPrismaHashtagWriter(tx).syncPostHashtags(
        createdPost.id,
        content,
      );
      const insertedMentions = await createTransactionMentionWriter(
        bindings,
        tx,
      ).syncPost(createdPost.id, mentionedUserIds);
      await (
        bindings.createNotificationWriter ?? createPrismaNotificationWriter
      )(tx).writeEvents(
        buildPostMentionEvents({
          senderId: author.id,
          postId: createdPost.id,
          insertedMentions,
        }),
      );

      const post = await tx.post.findUniqueOrThrow({
        where: {
          id: createdPost.id,
        },
        select: PostSelect.FEED,
      });

      return bindings.createPostResponseService(tx).enrichPost(post, author);
    });

    return response;
  } catch (error) {
    await bindings.mediaService.safeCleanupUploadedAssets(
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

  return PostResponseService.enrichPost(post, viewer);
};

const updateMutation = async (
  id: string,
  author: Express.AuthenticatedUser,
  payload: TUpdatePostInput,
  bindings: TPostMutationBindings,
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
  const mentionedUserIds =
    payload.mentionedUserIds === undefined
      ? undefined
      : MentionService.normalize(payload.mentionedUserIds);

  ensureValidWriteVisibility(visibility, existing.communityId);

  await validateAuthorCanPostInCommunity(
    author.id,
    existing.communityId ?? undefined,
  );

  if (!content) {
    const mediaCount = await prisma.postMedia.count({
      where: {
        postId: id,
      },
    });

    if (mediaCount === 0) {
      throw new AppError(
        status.BAD_REQUEST,
        "Post content or media is required",
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const result = await tx.post.updateMany({
      where: {
        id,
        authorId: author.id,
        isDeleted: false,
      },
      data: {
        ...(payload.content !== undefined && { content }),
        ...(payload.visibility !== undefined && { visibility }),
        isEdited: true,
      },
    });

    if (result.count === 0) {
      throw new AppError(status.NOT_FOUND, "Post not found");
    }

    if (payload.content !== undefined) {
      await createPrismaHashtagWriter(tx).syncPostHashtags(id, content);
    }

    if (mentionedUserIds !== undefined) {
      const insertedMentions = await createTransactionMentionWriter(
        bindings,
        tx,
      ).syncPost(id, mentionedUserIds);
      await (
        bindings.createNotificationWriter ?? createPrismaNotificationWriter
      )(tx).writeEvents(
        buildPostMentionEvents({
          senderId: author.id,
          postId: id,
          insertedMentions,
        }),
      );
    }

    const post = await tx.post.findUniqueOrThrow({
      where: {
        id,
      },
      select: PostSelect.FEED,
    });

    return bindings.createPostResponseService(tx).enrichPost(post, author);
  });
};

const remove = async (id: string, requester: Express.AuthenticatedUser) => {
  await prisma.$transaction(async (tx) => {
    const isAdmin = hasGlobalContentModerationAuthority(requester.role);
    const post = await tx.post.findFirst({
      where: isAdmin
        ? { id }
        : {
            id,
            OR: [
              { authorId: requester.id },
              {
                community: {
                  is: buildCommunityModerationWhere(requester.id),
                },
              },
            ],
          },
      select: { id: true },
    });

    if (!post) {
      throw new AppError(status.NOT_FOUND, "Post not found");
    }

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
      await createPrismaHashtagWriter(tx).decrementPostHashtags(post.id);
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

  if (source.community?.visibility === CommunityVisibility.PRIVATE) {
    throw new AppError(status.FORBIDDEN, "This post cannot be reposted");
  }
};

const repostMutation = async (
  sourcePostId: string,
  author: Express.AuthenticatedUser,
  payload: TCreateRepostInput,
  bindings: TPostMutationBindings,
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
          id: true,
          visibility: true,
        },
      },
    },
  });

  if (!sourcePost) {
    throw new AppError(status.NOT_FOUND, "Post not found");
  }

  assertRepostSourceCanBeReposted(sourcePost);

  if (sourcePost.community) {
    const participatingCommunity = await prisma.community.findFirst({
      where: {
        id: sourcePost.community.id,
        ...buildAvailableParticipationWhere(author.id),
      },
      select: { id: true },
    });

    if (!participatingCommunity) {
      throw new AppError(
        status.FORBIDDEN,
        "You cannot repost this community post",
      );
    }
  }

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
  const mentionedUserIds = MentionService.normalize(
    payload.mentionedUserIds ?? [],
  );

  return prisma.$transaction(async (tx) => {
    const original = await tx.post.findUniqueOrThrow({
      where: { id: originalId },
      select: { authorId: true },
    });
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

    await createPrismaHashtagWriter(tx).syncPostHashtags(
      createdPost.id,
      content,
    );
    const insertedMentions = await createTransactionMentionWriter(
      bindings,
      tx,
    ).syncPost(createdPost.id, mentionedUserIds);
    await (bindings.createNotificationWriter ?? createPrismaNotificationWriter)(
      tx,
    ).writeEvents([
      ...buildPostMentionEvents({
        senderId: author.id,
        postId: createdPost.id,
        insertedMentions,
      }),
      {
        type: NotificationType.REPOST,
        senderId: author.id,
        receiverId: original.authorId,
        sourceKey: `REPOST:${createdPost.id}`,
        target: { type: "POST" as const, id: originalId },
      },
    ]);

    const post = await tx.post.findUniqueOrThrow({
      where: {
        id: createdPost.id,
      },
      select: PostSelect.FEED,
    });

    return bindings.createPostResponseService(tx).enrichPost(post, author);
  });
};

export const createPostMutationService = (bindings: TPostMutationBindings) => ({
  create: (
    author: Express.AuthenticatedUser,
    payload: TCreatePostInput,
    files: Express.Multer.File[] = [],
  ) => createMutation(author, payload, files, bindings),
  update: (
    id: string,
    author: Express.AuthenticatedUser,
    payload: TUpdatePostInput,
  ) => updateMutation(id, author, payload, bindings),
  repost: (
    sourcePostId: string,
    author: Express.AuthenticatedUser,
    payload: TCreateRepostInput,
  ) => repostMutation(sourcePostId, author, payload, bindings),
});

const PostMutationService = createPostMutationService({
  createPostResponseService: createPrismaPostResponseService,
  createNotificationWriter: createPrismaNotificationWriter,
  mentionWriterFactory: (client) => MentionService.forClient(client),
  mediaService: UploadService,
});

export const PostService = {
  create: PostMutationService.create,
  getById,
  update: PostMutationService.update,
  delete: remove,
  repost: PostMutationService.repost,
};
