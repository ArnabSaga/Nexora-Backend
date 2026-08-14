import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  CommunityVisibility,
  NotificationType,
  PostVisibility,
  UserStatus,
} from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import AppError from "../../../../src/app/shared/errors/AppError";
import { CommentService } from "../../../../src/app/module/comment/comment.service";
import { createCommentMutationService } from "../../../../src/app/module/comment/comment.service";
import { createPrismaPostResponseService } from "../../../../src/app/module/post/services/post-response.service";
import {
  createPostMutationService,
  PostService,
} from "../../../../src/app/module/post/services/post.service";
import { MentionService } from "../../../../src/app/module/mention";
import { createPrismaVoteReadService } from "../../../../src/app/module/vote/vote-read.prisma.factory";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestCommunityWithOwnerMembership } from "../../../support/fixtures/community.fixture";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId) {
  throw new Error("TEST_RUN_ID is required; use the integration runner");
}

const runId = `${testRunId}-mention-service`;
const cleanup = createTestCleanup();
type TUser = Awaited<ReturnType<typeof createTestUser>>;

let author: TUser;
let first: TUser;
let second: TUser;
let third: TUser;
let commentVisibilityAuthor: TUser;
let parentPostId = "";

const requester = (user: TUser): Express.AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role: user.role,
  status: user.status,
});

const trackPost = (id: string) => {
  cleanup.add(`mention-post:${id}`, () =>
    prisma.post.deleteMany({ where: { id } }),
  );
  cleanup.add(`mention-notifications-post:${id}`, () =>
    prisma.notification.deleteMany({ where: { postId: id } }),
  );
};

const trackComment = (id: string) => {
  cleanup.add(`mention-comment:${id}`, () =>
    prisma.comment.deleteMany({ where: { id } }),
  );
  cleanup.add(`mention-notifications-comment:${id}`, () =>
    prisma.notification.deleteMany({ where: { commentId: id } }),
  );
};

before(async () => {
  author = await createTestUser({ cleanup, runId, label: "author" });
  first = await createTestUser({ cleanup, runId, label: "first" });
  second = await createTestUser({ cleanup, runId, label: "second" });
  third = await createTestUser({ cleanup, runId, label: "third" });
  commentVisibilityAuthor = await createTestUser({
    cleanup,
    runId,
    label: "comment-visibility-author",
  });
  const parent = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
  });
  parentPostId = parent.id;
  cleanup.add(`parent-notifications:${parent.id}`, () =>
    prisma.notification.deleteMany({ where: { postId: parent.id } }),
  );
});

after(async () => {
  try {
    await cleanup.run();
  } finally {
    await prisma.$disconnect();
  }
});

test("Structurally valid Mention IDs still require an eligible receiver", async () => {
  const ids = MentionService.normalize(["cmissingmention"]);

  await assert.rejects(
    MentionService.validateUsers(ids),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.message === "One or more mentioned users are invalid",
  );
});

test("Post Mention lifecycle uses physical relationships as event authority", async () => {
  const created = await PostService.create(requester(author), {
    content: `${runId} lifecycle`,
    mentionedUserIds: [first.id, first.id],
  });
  trackPost(created.id);

  const originalMention = await prisma.postMention.findUniqueOrThrow({
    where: {
      postId_mentionedUserId: {
        postId: created.id,
        mentionedUserId: first.id,
      },
    },
  });
  assert.equal(created.mentions.length, 1);
  assert.equal(
    await prisma.notification.count({
      where: { sourceKey: `MENTION:POST:${originalMention.id}` },
    }),
    1,
  );

  await PostService.update(created.id, requester(author), {
    mentionedUserIds: [first.id],
  });
  assert.equal(
    await prisma.notification.count({ where: { postId: created.id } }),
    1,
  );

  await PostService.update(created.id, requester(author), {
    mentionedUserIds: [],
  });
  assert.equal(
    await prisma.postMention.count({ where: { postId: created.id } }),
    0,
  );
  assert.equal(
    await prisma.notification.count({ where: { postId: created.id } }),
    1,
  );

  await PostService.update(created.id, requester(author), {
    mentionedUserIds: [first.id],
  });
  const replacement = await prisma.postMention.findUniqueOrThrow({
    where: {
      postId_mentionedUserId: {
        postId: created.id,
        mentionedUserId: first.id,
      },
    },
  });
  assert.notEqual(replacement.id, originalMention.id);
  assert.equal(
    await prisma.notification.count({ where: { postId: created.id } }),
    2,
  );
});

test("Post and Comment self-Mentions store relationships while delivery is suppressed", async () => {
  const post = await PostService.create(requester(author), {
    content: `${runId} self Mention Post`,
    mentionedUserIds: [author.id],
  });
  trackPost(post.id);
  const postMention = await prisma.postMention.findUniqueOrThrow({
    where: {
      postId_mentionedUserId: {
        postId: post.id,
        mentionedUserId: author.id,
      },
    },
  });
  assert.equal(
    await prisma.notification.count({
      where: { sourceKey: `MENTION:POST:${postMention.id}` },
    }),
    0,
  );

  const comment = await CommentService.createComment(
    parentPostId,
    requester(author),
    { content: "Self Mention Comment", mentionedUserIds: [author.id] },
  );
  trackComment(comment.id);
  const commentMention = await prisma.commentMention.findUniqueOrThrow({
    where: {
      commentId_mentionedUserId: {
        commentId: comment.id,
        mentionedUserId: author.id,
      },
    },
  });
  assert.equal(
    await prisma.notification.count({
      where: { sourceKey: `MENTION:COMMENT:${commentMention.id}` },
    }),
    0,
  );
});

test("Concurrent Mention replacements serialize to complete requested sets", async () => {
  const post = await createTestPost({
    cleanup,
    runId: `${runId}-concurrency`,
    authorId: author.id,
  });
  cleanup.add(`concurrent-notifications:${post.id}`, () =>
    prisma.notification.deleteMany({ where: { postId: post.id } }),
  );

  await Promise.all([
    PostService.update(post.id, requester(author), {
      mentionedUserIds: [second.id],
    }),
    PostService.update(post.id, requester(author), {
      mentionedUserIds: [second.id],
    }),
  ]);
  assert.equal(
    await prisma.postMention.count({ where: { postId: post.id } }),
    1,
  );
  assert.equal(
    await prisma.notification.count({
      where: { postId: post.id, type: NotificationType.MENTION },
    }),
    1,
  );

  await PostService.update(post.id, requester(author), {
    mentionedUserIds: [first.id],
  });
  await Promise.all([
    PostService.update(post.id, requester(author), {
      mentionedUserIds: [second.id],
    }),
    PostService.update(post.id, requester(author), {
      mentionedUserIds: [third.id],
    }),
  ]);

  const finalIds = await prisma.postMention.findMany({
    where: { postId: post.id },
    select: { mentionedUserId: true },
  });
  assert.equal(finalIds.length, 1);
  assert.equal(
    [second.id, third.id].includes(finalIds[0].mentionedUserId),
    true,
  );
});

test("Concurrent Comment Mention replacements preserve complete sets and event history", async () => {
  const sameSetComment = await CommentService.createComment(
    parentPostId,
    requester(author),
    { content: "Concurrent same-set Comment Mention" },
  );
  trackComment(sameSetComment.id);

  await Promise.all([
    CommentService.updateComment(sameSetComment.id, requester(author), {
      mentionedUserIds: [second.id],
    }),
    CommentService.updateComment(sameSetComment.id, requester(author), {
      mentionedUserIds: [second.id],
    }),
  ]);

  assert.equal(
    await prisma.commentMention.count({
      where: {
        commentId: sameSetComment.id,
        mentionedUserId: second.id,
      },
    }),
    1,
  );
  assert.equal(
    await prisma.notification.count({
      where: {
        commentId: sameSetComment.id,
        receiverId: second.id,
        type: NotificationType.MENTION,
      },
    }),
    1,
  );

  const competingComment = await CommentService.createComment(
    parentPostId,
    requester(author),
    {
      content: "Concurrent competing Comment Mentions",
      mentionedUserIds: [first.id],
    },
  );
  trackComment(competingComment.id);

  await Promise.all([
    CommentService.updateComment(competingComment.id, requester(author), {
      mentionedUserIds: [second.id],
    }),
    CommentService.updateComment(competingComment.id, requester(author), {
      mentionedUserIds: [third.id],
    }),
  ]);

  const currentMentions = await prisma.commentMention.findMany({
    where: { commentId: competingComment.id },
    select: { mentionedUserId: true },
  });
  assert.equal(currentMentions.length, 1);
  assert.equal(
    [second.id, third.id].includes(currentMentions[0].mentionedUserId),
    true,
  );

  const competingNotifications = await prisma.notification.findMany({
    where: {
      commentId: competingComment.id,
      receiverId: { in: [second.id, third.id] },
      type: NotificationType.MENTION,
    },
    select: { receiverId: true, sourceKey: true },
  });
  assert.equal(
    competingNotifications.filter((item) => item.receiverId === second.id)
      .length,
    1,
  );
  assert.equal(
    competingNotifications.filter((item) => item.receiverId === third.id)
      .length,
    1,
  );
  assert.equal(competingNotifications.length, 2);
  const sourceKeys = competingNotifications.map((item) => item.sourceKey);
  assert.equal(
    sourceKeys.every((sourceKey) => sourceKey?.startsWith("MENTION:COMMENT:")),
    true,
  );
  assert.equal(new Set(sourceKeys).size, 2);
});

test("Comment and Reply Mentions target their owning Comment rows", async () => {
  const comment = await CommentService.createComment(
    parentPostId,
    requester(author),
    { content: "Comment mention", mentionedUserIds: [first.id] },
  );
  trackComment(comment.id);
  assert.equal(comment.mentions[0].user.id, first.id);

  const commentMention = await prisma.commentMention.findUniqueOrThrow({
    where: {
      commentId_mentionedUserId: {
        commentId: comment.id,
        mentionedUserId: first.id,
      },
    },
  });
  const commentNotification = await prisma.notification.findUniqueOrThrow({
    where: { sourceKey: `MENTION:COMMENT:${commentMention.id}` },
  });
  assert.equal(commentNotification.commentId, comment.id);
  assert.equal(commentNotification.postId, parentPostId);

  const reply = await CommentService.createReply(
    comment.id,
    requester(author),
    { content: "Reply mention", mentionedUserIds: [second.id] },
  );
  trackComment(reply.id);
  const replyMention = await prisma.commentMention.findUniqueOrThrow({
    where: {
      commentId_mentionedUserId: {
        commentId: reply.id,
        mentionedUserId: second.id,
      },
    },
  });
  const replyNotification = await prisma.notification.findUniqueOrThrow({
    where: { sourceKey: `MENTION:COMMENT:${replyMention.id}` },
  });
  assert.equal(replyNotification.commentId, reply.id);
  assert.equal(replyNotification.postId, parentPostId);

  const updated = await CommentService.updateComment(
    comment.id,
    requester(author),
    { mentionedUserIds: [third.id] },
  );
  assert.equal(updated.isEdited, true);
  assert.deepEqual(
    updated.mentions.map((item) => item.user.id),
    [third.id],
  );

  const repost = await PostService.repost(parentPostId, requester(author), {
    content: "Repost Mention target",
    mentionedUserIds: [first.id],
  });
  trackPost(repost.id);
  const repostMention = await prisma.postMention.findUniqueOrThrow({
    where: {
      postId_mentionedUserId: {
        postId: repost.id,
        mentionedUserId: first.id,
      },
    },
  });
  const repostMentionNotification = await prisma.notification.findUniqueOrThrow(
    { where: { sourceKey: `MENTION:POST:${repostMention.id}` } },
  );
  assert.equal(repostMentionNotification.postId, repost.id);
  assert.notEqual(repostMentionNotification.postId, parentPostId);
});

test("Unavailable existing Mentions are preserved when omitted and clear without eligibility", async () => {
  const post = await createTestPost({
    cleanup,
    runId: `${runId}-availability`,
    authorId: author.id,
  });
  await prisma.$transaction((tx) =>
    MentionService.forClient(tx).syncPost(post.id, [first.id]),
  );

  const relationship = await prisma.postMention.findUniqueOrThrow({
    where: {
      postId_mentionedUserId: {
        postId: post.id,
        mentionedUserId: first.id,
      },
    },
  });

  try {
    await prisma.user.update({
      where: { id: first.id },
      data: { status: UserStatus.SUSPENDED },
    });
    await PostService.update(post.id, requester(author), {
      content: "Updated without mention field",
    });
    assert.equal(
      await prisma.postMention.count({ where: { postId: post.id } }),
      1,
    );
    assert.deepEqual(
      (await PostService.getById(post.id, requester(author))).mentions,
      [],
    );

    await prisma.user.update({
      where: { id: first.id },
      data: { status: UserStatus.ACTIVE },
    });
    assert.equal(
      (await PostService.getById(post.id, requester(author))).mentions[0].id,
      relationship.id,
    );

    await prisma.user.update({
      where: { id: first.id },
      data: { status: UserStatus.SUSPENDED },
    });
    await assert.rejects(
      PostService.update(post.id, requester(author), {
        mentionedUserIds: [first.id],
      }),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
    await PostService.update(post.id, requester(author), {
      mentionedUserIds: [],
    });
    assert.equal(
      await prisma.postMention.count({ where: { postId: post.id } }),
      0,
    );
  } finally {
    await prisma.user.update({
      where: { id: first.id },
      data: { status: UserStatus.ACTIVE },
    });
  }
});

test("Comment Mentions hide and restore the same stored relationship", async () => {
  const comment = await CommentService.createComment(
    parentPostId,
    requester(author),
    { content: "Availability Comment", mentionedUserIds: [first.id] },
  );
  trackComment(comment.id);
  const relationship = await prisma.commentMention.findUniqueOrThrow({
    where: {
      commentId_mentionedUserId: {
        commentId: comment.id,
        mentionedUserId: first.id,
      },
    },
  });

  try {
    await prisma.user.update({
      where: { id: first.id },
      data: { status: UserStatus.SUSPENDED },
    });
    const hidden = await CommentService.getPostComments(
      parentPostId,
      {},
      requester(author),
    );
    assert.deepEqual(
      hidden.data.find((item) => item.id === comment.id)?.mentions,
      [],
    );
    await CommentService.updateComment(comment.id, requester(author), {
      content: "Availability preserved",
    });
    assert.equal(
      await prisma.commentMention.count({ where: { id: relationship.id } }),
      1,
    );

    await prisma.user.update({
      where: { id: first.id },
      data: { status: UserStatus.ACTIVE },
    });
    const restored = await CommentService.getPostComments(
      parentPostId,
      {},
      requester(author),
    );
    assert.equal(
      restored.data.find((item) => item.id === comment.id)?.mentions[0].id,
      relationship.id,
    );

    await prisma.user.update({
      where: { id: first.id },
      data: { status: UserStatus.SUSPENDED },
    });
    await assert.rejects(
      CommentService.updateComment(comment.id, requester(author), {
        mentionedUserIds: [first.id],
      }),
      (error: unknown) => error instanceof AppError && error.statusCode === 400,
    );
    await CommentService.updateComment(comment.id, requester(author), {
      mentionedUserIds: [],
    });
    assert.equal(
      await prisma.commentMention.count({ where: { id: relationship.id } }),
      0,
    );
  } finally {
    await prisma.user.update({
      where: { id: first.id },
      data: { status: UserStatus.ACTIVE },
    });
  }
});

test("Post and Comment omission never invokes Mention synchronization", async () => {
  const post = await createTestPost({
    cleanup,
    runId: `${runId}-omission`,
    authorId: author.id,
  });
  const comment = await CommentService.createComment(
    parentPostId,
    requester(author),
    { content: "Omission Comment" },
  );
  trackComment(comment.id);
  let syncCalls = 0;
  const mentionWriterFactory = () => ({
    validateUsers: async () => undefined,
    syncPost: async () => {
      syncCalls += 1;
      return [];
    },
    syncComment: async () => {
      syncCalls += 1;
      return [];
    },
  });
  const postService = createPostMutationService({
    createPostResponseService: createPrismaPostResponseService,
    createNotificationWriter: () => ({ writeEvents: async () => undefined }),
    mentionWriterFactory,
    mediaService: {
      validateFiles: () => undefined,
      uploadFiles: async () => [],
      safeCleanupUploadedMedia: async () => undefined,
    },
  });
  const commentService = createCommentMutationService({
    createVoteReadService: createPrismaVoteReadService,
    createNotificationWriter: () => ({ writeEvents: async () => undefined }),
    mentionWriterFactory,
  });

  await postService.update(post.id, requester(author), {
    content: "Post changed without Mention input",
  });
  await commentService.updateComment(comment.id, requester(author), {
    content: "Comment changed without Mention input",
  });
  assert.equal(syncCalls, 0);
});

test("Post and Comment Mention updates linearize with soft deletion", async () => {
  const post = await PostService.create(requester(author), {
    content: `${runId} Post race`,
    mentionedUserIds: [first.id],
  });
  trackPost(post.id);
  const [postUpdate, postDelete] = await Promise.allSettled([
    PostService.update(post.id, requester(author), {
      mentionedUserIds: [second.id],
    }),
    PostService.delete(post.id, requester(author)),
  ]);
  assert.equal(postDelete.status, "fulfilled");
  const finalPost = await prisma.post.findUniqueOrThrow({
    where: { id: post.id },
    select: {
      isDeleted: true,
      mentions: { select: { mentionedUserId: true } },
    },
  });
  assert.equal(finalPost.isDeleted, true);
  if (postUpdate.status === "fulfilled") {
    assert.deepEqual(finalPost.mentions, [{ mentionedUserId: second.id }]);
    assert.equal(
      await prisma.notification.count({
        where: {
          postId: post.id,
          receiverId: second.id,
          type: NotificationType.MENTION,
        },
      }),
      1,
    );
  } else {
    assert.equal(
      postUpdate.reason instanceof AppError &&
        postUpdate.reason.statusCode === 404 &&
        postUpdate.reason.message === "Post not found",
      true,
    );
    assert.deepEqual(finalPost.mentions, [{ mentionedUserId: first.id }]);
    assert.equal(
      await prisma.notification.count({
        where: { postId: post.id, receiverId: second.id },
      }),
      0,
    );
  }

  const comment = await CommentService.createComment(
    parentPostId,
    requester(author),
    { content: "Comment race", mentionedUserIds: [first.id] },
  );
  trackComment(comment.id);
  const [commentUpdate, commentDelete] = await Promise.allSettled([
    CommentService.updateComment(comment.id, requester(author), {
      mentionedUserIds: [second.id],
    }),
    CommentService.deleteComment(comment.id, requester(author)),
  ]);
  assert.equal(commentDelete.status, "fulfilled");
  const finalComment = await prisma.comment.findUniqueOrThrow({
    where: { id: comment.id },
    select: {
      isDeleted: true,
      mentions: { select: { mentionedUserId: true } },
    },
  });
  assert.equal(finalComment.isDeleted, true);
  if (commentUpdate.status === "fulfilled") {
    assert.deepEqual(finalComment.mentions, [{ mentionedUserId: second.id }]);
    assert.equal(
      await prisma.notification.count({
        where: {
          commentId: comment.id,
          receiverId: second.id,
          type: NotificationType.MENTION,
        },
      }),
      1,
    );
  } else {
    assert.equal(
      commentUpdate.reason instanceof AppError &&
        commentUpdate.reason.statusCode === 404 &&
        commentUpdate.reason.message === "Comment not found",
      true,
    );
    assert.deepEqual(finalComment.mentions, [{ mentionedUserId: first.id }]);
    assert.equal(
      await prisma.notification.count({
        where: { commentId: comment.id, receiverId: second.id },
      }),
      0,
    );
  }
});

test("Post Mentions never change parent authorization", async () => {
  const publicCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: author.id,
    label: "mention-community-only",
    visibility: CommunityVisibility.PUBLIC,
  });
  const privateCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: author.id,
    label: "mention-private-community",
    visibility: CommunityVisibility.PRIVATE,
  });
  const cases = [
    await PostService.create(requester(author), {
      content: `${runId} followers Mention parent`,
      visibility: PostVisibility.FOLLOWERS,
    }),
    await PostService.create(requester(author), {
      content: `${runId} community-only Mention parent`,
      visibility: PostVisibility.COMMUNITY_ONLY,
      communityId: publicCommunity.id,
    }),
    await PostService.create(requester(author), {
      content: `${runId} private Community Mention parent`,
      visibility: PostVisibility.PUBLIC,
      communityId: privateCommunity.id,
    }),
  ];

  for (const post of cases) {
    trackPost(post.id);
    await assert.rejects(
      PostService.getById(post.id, requester(first)),
      (error: unknown) => error instanceof AppError && error.statusCode === 404,
    );

    await PostService.update(post.id, requester(author), {
      mentionedUserIds: [first.id],
    });
    assert.equal(
      await prisma.postMention.count({
        where: { postId: post.id, mentionedUserId: first.id },
      }),
      1,
    );

    await assert.rejects(
      PostService.getById(post.id, requester(first)),
      (error: unknown) => error instanceof AppError && error.statusCode === 404,
    );
  }
});

test("Hidden Comments retain their stored Mention relationships", async () => {
  const deletedComment = await CommentService.createComment(
    parentPostId,
    requester(author),
    {
      content: "Soft-deleted Comment with Mention",
      mentionedUserIds: [first.id],
    },
  );
  trackComment(deletedComment.id);
  const deletedMention = await prisma.commentMention.findUniqueOrThrow({
    where: {
      commentId_mentionedUserId: {
        commentId: deletedComment.id,
        mentionedUserId: first.id,
      },
    },
  });

  await CommentService.deleteComment(deletedComment.id, requester(author));
  const afterDeletion = await CommentService.getPostComments(
    parentPostId,
    {},
    requester(first),
  );
  assert.equal(
    afterDeletion.data.some((comment) => comment.id === deletedComment.id),
    false,
  );
  assert.equal(
    await prisma.commentMention.count({ where: { id: deletedMention.id } }),
    1,
  );

  const unavailableAuthorComment = await CommentService.createComment(
    parentPostId,
    requester(commentVisibilityAuthor),
    {
      content: "Unavailable-author Comment with Mention",
      mentionedUserIds: [first.id],
    },
  );
  trackComment(unavailableAuthorComment.id);
  const unavailableAuthorMention =
    await prisma.commentMention.findUniqueOrThrow({
      where: {
        commentId_mentionedUserId: {
          commentId: unavailableAuthorComment.id,
          mentionedUserId: first.id,
        },
      },
    });

  try {
    await prisma.user.update({
      where: { id: commentVisibilityAuthor.id },
      data: { status: UserStatus.SUSPENDED },
    });
    const whileUnavailable = await CommentService.getPostComments(
      parentPostId,
      {},
      requester(first),
    );
    assert.equal(
      whileUnavailable.data.some(
        (comment) => comment.id === unavailableAuthorComment.id,
      ),
      false,
    );
    assert.equal(
      await prisma.commentMention.count({
        where: { id: unavailableAuthorMention.id },
      }),
      1,
    );
  } finally {
    await prisma.user.update({
      where: { id: commentVisibilityAuthor.id },
      data: { status: UserStatus.ACTIVE },
    });
  }
});

test("Notification failure rolls back a complete multi-Mention replacement", async () => {
  const post = await createTestPost({
    cleanup,
    runId: `${runId}-rollback`,
    authorId: author.id,
    content: "Original content",
  });
  await prisma.$transaction((tx) =>
    MentionService.forClient(tx).syncPost(post.id, [first.id]),
  );
  const sentinel = new Error("forced Mention notification failure");
  const service = createPostMutationService({
    createPostResponseService: createPrismaPostResponseService,
    createNotificationWriter: () => ({
      writeEvents: async () => {
        throw sentinel;
      },
    }),
    mediaService: {
      validateFiles: () => undefined,
      uploadFiles: async () => [],
      safeCleanupUploadedMedia: async () => undefined,
    },
  });

  await assert.rejects(
    service.update(post.id, requester(author), {
      content: "Impossible content",
      mentionedUserIds: [second.id, third.id],
    }),
    (error) => error === sentinel,
  );

  const finalPost = await prisma.post.findUniqueOrThrow({
    where: { id: post.id },
    select: {
      content: true,
      mentions: { select: { mentionedUserId: true } },
    },
  });
  assert.equal(finalPost.content, "Original content");
  assert.deepEqual(finalPost.mentions, [{ mentionedUserId: first.id }]);
  assert.equal(
    await prisma.notification.count({
      where: {
        postId: post.id,
        receiverId: { in: [second.id, third.id] },
      },
    }),
    0,
  );
});
