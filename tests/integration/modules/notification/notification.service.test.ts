import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  CommunityMemberRole,
  NotificationTargetType,
  NotificationType,
  PostVisibility,
  ReactionType,
  UserStatus,
} from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import { NotificationService } from "../../../../src/app/module/notification/notification.service";
import { FollowService } from "../../../../src/app/module/follow/follow.service";
import { ReactionService } from "../../../../src/app/module/reaction/reaction.service";
import { CommentService } from "../../../../src/app/module/comment/comment.service";
import { PostService } from "../../../../src/app/module/post/services/post.service";
import { createPostMutationService } from "../../../../src/app/module/post/services/post.service";
import { CommunityMemberService } from "../../../../src/app/module/community-member/community-member.service";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestNotification } from "../../../support/fixtures/notification.fixture";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";
import { createTestCommunityWithOwnerMembership } from "../../../support/fixtures/community.fixture";
import { createTestCommunityMember } from "../../../support/fixtures/community-member.fixture";
import { createReactionNotificationClaimService } from "../../../../src/app/module/reaction/reaction-notification-claim.factory";
import { createPrismaNotificationWriter } from "../../../../src/app/shared/notifications/notification-writer.prisma.factory";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId)
  throw new Error("TEST_RUN_ID is required; use the integration runner");
const runId = `${testRunId}-notification-service`;
const cleanup = createTestCleanup();
type TUser = Awaited<ReturnType<typeof createTestUser>>;
const actor = (user: TUser): Express.AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role: user.role,
  status: user.status,
});

after(async () => {
  try {
    await cleanup.run();
  } finally {
    await prisma.$disconnect();
  }
});

test("Notification timeline is receiver-scoped, cursor ordered, and idempotently mutable", async () => {
  const receiver = await createTestUser({
    cleanup,
    runId,
    label: "timeline-receiver",
  });
  const other = await createTestUser({
    cleanup,
    runId,
    label: "timeline-other",
  });
  const stamp = new Date("2026-08-12T18:00:00.000Z");
  const rows = await Promise.all([
    createTestNotification({
      cleanup,
      receiverId: receiver.id,
      sourceKey: `${runId}:a`,
      createdAt: stamp,
    }),
    createTestNotification({
      cleanup,
      receiverId: receiver.id,
      sourceKey: `${runId}:b`,
      createdAt: stamp,
    }),
    createTestNotification({
      cleanup,
      receiverId: other.id,
      sourceKey: `${runId}:other`,
      createdAt: stamp,
    }),
  ]);
  const expected = await prisma.notification.findMany({
    where: { id: { in: rows.slice(0, 2).map((row) => row.id) } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });
  const first = await NotificationService.getNotifications(actor(receiver), {
    limit: 1,
  });
  const second = await NotificationService.getNotifications(actor(receiver), {
    limit: 1,
    cursor: first.meta.nextCursor!,
  });
  assert.deepEqual(
    [...first.data, ...second.data].map((item) => item.id),
    expected.map((item) => item.id),
  );
  await NotificationService.markRead(rows[0].id, actor(receiver));
  await NotificationService.markRead(rows[2].id, actor(receiver));
  assert.equal(
    (
      await NotificationService.getNotifications(actor(receiver), {
        isRead: true,
      })
    ).data.length,
    1,
  );
  await NotificationService.deleteNotification(rows[0].id, actor(receiver));
  await NotificationService.deleteNotification(rows[0].id, actor(receiver));
});

test("Notification targets become tombstones without leaking hidden Posts", async () => {
  const sender = await createTestUser({
    cleanup,
    runId,
    label: "target-sender",
  });
  const receiver = await createTestUser({
    cleanup,
    runId,
    label: "target-receiver",
  });
  const post = await createTestPost({
    cleanup,
    runId,
    authorId: sender.id,
    visibility: PostVisibility.PRIVATE,
  });
  const notification = await createTestNotification({
    cleanup,
    receiverId: receiver.id,
    senderId: sender.id,
    type: NotificationType.REACTION,
    sourceKey: `${runId}:hidden`,
    targetType: NotificationTargetType.POST,
    targetId: post.id,
    postId: post.id,
    message: "Sender Name reacted to secret content",
  });
  await prisma.user.update({
    where: { id: sender.id },
    data: { status: UserStatus.SUSPENDED },
  });
  const list = await NotificationService.getNotifications(actor(receiver), {});
  const item = list.data.find((row) => row.id === notification.id);
  assert.equal(item?.target?.unavailable, true);
  assert.equal(item?.sender, null);
  assert.equal(item?.message, "reacted to your post");
  assert.equal(JSON.stringify(item).includes("Sender Name"), false);
  assert.equal(JSON.stringify(item).includes(post.content), false);

  const malformed = await createTestNotification({
    cleanup,
    receiverId: receiver.id,
    type: NotificationType.REACTION,
    sourceKey: `${runId}:malformed-reaction`,
    message: "Unsafe historical message",
  });
  const refreshed = await NotificationService.getNotifications(
    actor(receiver),
    {},
  );
  assert.equal(
    refreshed.data.find((row) => row.id === malformed.id)?.message,
    "reacted to your content",
  );
});

test("Supported source mutations create deduplicated actor-neutral notifications", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "producer-author",
  });
  const actorUser = await createTestUser({
    cleanup,
    runId,
    label: "producer-actor",
  });
  const post = await createTestPost({ cleanup, runId, authorId: author.id });
  await FollowService.followUser(author.id, actor(actorUser));
  await FollowService.followUser(author.id, actor(actorUser));
  const follow = await prisma.follow.findUniqueOrThrow({
    where: {
      followerId_followingId: {
        followerId: actorUser.id,
        followingId: author.id,
      },
    },
  });
  cleanup.add(`producer-follow:${follow.id}`, () =>
    prisma.follow.deleteMany({ where: { id: follow.id } }),
  );
  const reaction = await ReactionService.savePostReaction(
    post.id,
    actor(actorUser),
    { reactionType: ReactionType.LIKE },
  );
  cleanup.add(`producer-reaction:${reaction.id}`, () =>
    prisma.postReaction.deleteMany({ where: { id: reaction.id } }),
  );
  await ReactionService.savePostReaction(post.id, actor(actorUser), {
    reactionType: ReactionType.LOVE,
  });
  const comment = await CommentService.createComment(
    post.id,
    actor(actorUser),
    { content: "Hello" },
  );
  cleanup.add(`producer-comment:${comment.id}`, () =>
    prisma.comment.deleteMany({ where: { id: comment.id } }),
  );
  const reply = await CommentService.createReply(comment.id, actor(author), {
    content: "Reply",
  });
  cleanup.add(`producer-reply:${reply.id}`, () =>
    prisma.comment.deleteMany({ where: { id: reply.id } }),
  );
  const mentionPost = await PostService.create(actor(actorUser), {
    content: "Mention",
    mentionedUserIds: [author.id, author.id],
  });
  cleanup.add(`producer-mention-post:${mentionPost.id}`, () =>
    prisma.post.deleteMany({ where: { id: mentionPost.id } }),
  );
  const repost = await PostService.repost(post.id, actor(actorUser), {
    content: "",
  });
  cleanup.add(`producer-repost:${repost.id}`, () =>
    prisma.post.deleteMany({ where: { id: repost.id } }),
  );
  const notifications = await prisma.notification.findMany({
    where: { receiverId: author.id },
  });
  assert.equal(
    notifications.filter((item) => item.type === NotificationType.FOLLOW)
      .length,
    1,
  );
  assert.equal(
    notifications.filter((item) => item.type === NotificationType.REACTION)
      .length,
    1,
  );
  assert.equal(
    notifications.filter((item) => item.type === NotificationType.COMMENT)
      .length,
    1,
  );
  assert.equal(
    notifications.filter((item) => item.type === NotificationType.MENTION)
      .length,
    1,
  );
  assert.equal(
    notifications.filter((item) => item.type === NotificationType.REPOST)
      .length,
    1,
  );
  notifications.forEach((item) =>
    cleanup.add(`producer-notification:${item.id}`, () =>
      prisma.notification.deleteMany({ where: { id: item.id } }),
    ),
  );
});

test("Comment Reaction, Reply, and nested Repost producers use canonical receivers", async () => {
  const originalAuthor = await createTestUser({
    cleanup,
    runId,
    label: "matrix-original-author",
  });
  const commentAuthor = await createTestUser({
    cleanup,
    runId,
    label: "matrix-comment-author",
  });
  const reactor = await createTestUser({
    cleanup,
    runId,
    label: "matrix-reactor",
  });
  const nestedReposter = await createTestUser({
    cleanup,
    runId,
    label: "matrix-nested-reposter",
  });
  const post = await createTestPost({
    cleanup,
    runId,
    authorId: originalAuthor.id,
  });
  const comment = await CommentService.createComment(
    post.id,
    actor(commentAuthor),
    { content: "Producer matrix comment" },
  );
  cleanup.add(`matrix-comment:${comment.id}`, () =>
    prisma.comment.deleteMany({ where: { id: comment.id } }),
  );
  const commentReaction = await ReactionService.saveCommentReaction(
    comment.id,
    actor(reactor),
    { reactionType: ReactionType.INSIGHTFUL },
  );
  cleanup.add(`matrix-comment-reaction:${commentReaction.id}`, () =>
    prisma.commentReaction.deleteMany({ where: { id: commentReaction.id } }),
  );
  const reply = await CommentService.createReply(comment.id, actor(reactor), {
    content: "Producer matrix reply",
  });
  cleanup.add(`matrix-reply:${reply.id}`, () =>
    prisma.comment.deleteMany({ where: { id: reply.id } }),
  );
  const firstRepost = await PostService.repost(post.id, actor(commentAuthor), {
    content: "",
  });
  cleanup.add(`matrix-first-repost:${firstRepost.id}`, () =>
    prisma.post.deleteMany({ where: { id: firstRepost.id } }),
  );
  const nestedRepost = await PostService.repost(
    firstRepost.id,
    actor(nestedReposter),
    { content: "" },
  );
  cleanup.add(`matrix-nested-repost:${nestedRepost.id}`, () =>
    prisma.post.deleteMany({ where: { id: nestedRepost.id } }),
  );

  const commentAuthorEvents = await prisma.notification.findMany({
    where: { receiverId: commentAuthor.id },
  });
  const reactionEvent = commentAuthorEvents.find(
    (item) => item.sourceKey === `REACTION:COMMENT:${commentReaction.id}`,
  );
  assert.equal(reactionEvent?.type, NotificationType.REACTION);
  assert.equal(reactionEvent?.targetType, NotificationTargetType.COMMENT);
  assert.equal(reactionEvent?.targetId, comment.id);
  assert.equal(reactionEvent?.postId, post.id);
  assert.equal(reactionEvent?.message, "reacted to your comment");
  const replyEvent = commentAuthorEvents.find(
    (item) => item.sourceKey === `REPLY:${reply.id}`,
  );
  assert.equal(replyEvent?.receiverId, commentAuthor.id);
  assert.equal(replyEvent?.targetId, reply.id);
  assert.equal(replyEvent?.message, "replied to your comment");

  const nestedEvent = await prisma.notification.findUnique({
    where: { sourceKey: `REPOST:${nestedRepost.id}` },
  });
  assert.equal(nestedEvent?.receiverId, originalAuthor.id);
  assert.notEqual(nestedEvent?.receiverId, commentAuthor.id);
  assert.equal(nestedEvent?.targetId, post.id);
  assert.equal(nestedEvent?.message, "reposted your post");
  assert.equal("notificationClaimedAt" in commentReaction, false);

  for (const event of [...commentAuthorEvents, nestedEvent].filter(
    (item): item is NonNullable<typeof item> => item !== null,
  )) {
    cleanup.add(`matrix-notification:${event.id}`, () =>
      prisma.notification.deleteMany({ where: { id: event.id } }),
    );
  }
});

test("Reaction claims survive Notification deletion and reset only with a new relationship", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "claim-author",
  });
  const reactor = await createTestUser({
    cleanup,
    runId,
    label: "claim-reactor",
  });
  const post = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
  });
  const first = await ReactionService.savePostReaction(
    post.id,
    actor(reactor),
    { reactionType: ReactionType.LIKE },
  );
  cleanup.add(`claim-first-reaction:${first.id}`, () =>
    prisma.postReaction.deleteMany({ where: { id: first.id } }),
  );
  const firstRow = await prisma.postReaction.findUniqueOrThrow({
    where: { id: first.id },
  });
  assert.ok(firstRow.notificationClaimedAt);
  const firstEvent = await prisma.notification.findUniqueOrThrow({
    where: { sourceKey: `REACTION:POST:${first.id}` },
  });
  await NotificationService.deleteNotification(firstEvent.id, actor(author));

  await ReactionService.savePostReaction(post.id, actor(reactor), {
    reactionType: ReactionType.LOVE,
  });
  await ReactionService.savePostReaction(post.id, actor(reactor), {
    reactionType: ReactionType.CELEBRATE,
  });
  const afterUpdates = await prisma.postReaction.findUniqueOrThrow({
    where: { id: first.id },
  });
  assert.equal(
    afterUpdates.notificationClaimedAt?.getTime(),
    firstRow.notificationClaimedAt.getTime(),
  );
  assert.equal(
    await prisma.notification.count({
      where: { sourceKey: `REACTION:POST:${first.id}` },
    }),
    0,
  );

  await ReactionService.removePostReaction(post.id, actor(reactor));
  const recreated = await ReactionService.savePostReaction(
    post.id,
    actor(reactor),
    { reactionType: ReactionType.FUNNY },
  );
  cleanup.add(`claim-recreated-reaction:${recreated.id}`, () =>
    prisma.postReaction.deleteMany({ where: { id: recreated.id } }),
  );
  assert.notEqual(recreated.id, first.id);
  const recreatedEvent = await prisma.notification.findUniqueOrThrow({
    where: { sourceKey: `REACTION:POST:${recreated.id}` },
  });
  cleanup.add(`claim-recreated-notification:${recreatedEvent.id}`, () =>
    prisma.notification.deleteMany({ where: { id: recreatedEvent.id } }),
  );
});

test("Reaction claim and mutation roll back together when the writer fails", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "claim-rollback-author",
  });
  const reactor = await createTestUser({
    cleanup,
    runId,
    label: "claim-rollback-reactor",
  });
  const post = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
  });
  const originalError = new Error("notification unavailable");

  await assert.rejects(
    prisma.$transaction(async (tx) => {
      const reaction = await tx.postReaction.create({
        data: {
          userId: reactor.id,
          postId: post.id,
          reactionType: ReactionType.LIKE,
        },
      });
      const claimService = createReactionNotificationClaimService({
        claimNotification: async (reactionId) =>
          (
            await tx.postReaction.updateMany({
              where: { id: reactionId, notificationClaimedAt: null },
              data: { notificationClaimedAt: new Date() },
            })
          ).count === 1,
        writeNotification: async () => {
          throw originalError;
        },
      });
      await claimService.claimAndNotify(reaction.id, {
        type: NotificationType.REACTION,
        senderId: reactor.id,
        receiverId: author.id,
        sourceKey: `REACTION:POST:${reaction.id}`,
        target: { type: "POST", id: post.id },
      });
    }),
    (error) => error === originalError,
  );
  assert.equal(
    await prisma.postReaction.count({
      where: { userId: reactor.id, postId: post.id },
    }),
    0,
  );

  const existing = await prisma.postReaction.create({
    data: {
      userId: reactor.id,
      postId: post.id,
      reactionType: ReactionType.LIKE,
    },
  });
  cleanup.add(`claim-rollback-existing:${existing.id}`, () =>
    prisma.postReaction.deleteMany({ where: { id: existing.id } }),
  );
  await assert.rejects(
    prisma.$transaction(async (tx) => {
      await tx.postReaction.update({
        where: { id: existing.id },
        data: { reactionType: ReactionType.LOVE },
      });
      const claimService = createReactionNotificationClaimService({
        claimNotification: async (reactionId) =>
          (
            await tx.postReaction.updateMany({
              where: { id: reactionId, notificationClaimedAt: null },
              data: { notificationClaimedAt: new Date() },
            })
          ).count === 1,
        writeNotification: async () => {
          throw originalError;
        },
      });
      await claimService.claimAndNotify(existing.id, {
        type: NotificationType.REACTION,
        senderId: reactor.id,
        receiverId: author.id,
        sourceKey: `REACTION:POST:${existing.id}`,
        target: { type: "POST", id: post.id },
      });
    }),
    (error) => error === originalError,
  );
  const restored = await prisma.postReaction.findUniqueOrThrow({
    where: { id: existing.id },
  });
  assert.equal(restored.reactionType, ReactionType.LIKE);
  assert.equal(restored.notificationClaimedAt, null);
});

test("Unavailable receiver suppression permanently consumes the Reaction claim", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "claim-suppressed-author",
  });
  const reactor = await createTestUser({
    cleanup,
    runId,
    label: "claim-suppressed-reactor",
  });
  const post = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
  });
  await prisma.user.update({
    where: { id: author.id },
    data: { status: UserStatus.SUSPENDED },
  });
  const reaction = await prisma.$transaction(async (tx) => {
    const created = await tx.postReaction.create({
      data: {
        userId: reactor.id,
        postId: post.id,
        reactionType: ReactionType.LIKE,
      },
    });
    const writer = createPrismaNotificationWriter(tx);
    const claimService = createReactionNotificationClaimService({
      claimNotification: async (reactionId) =>
        (
          await tx.postReaction.updateMany({
            where: { id: reactionId, notificationClaimedAt: null },
            data: { notificationClaimedAt: new Date() },
          })
        ).count === 1,
      writeNotification: async (event) => writer.writeEvents([event]),
    });
    await claimService.claimAndNotify(created.id, {
      type: NotificationType.REACTION,
      senderId: reactor.id,
      receiverId: author.id,
      sourceKey: `REACTION:POST:${created.id}`,
      target: { type: "POST", id: post.id },
    });
    return tx.postReaction.findUniqueOrThrow({ where: { id: created.id } });
  });
  cleanup.add(`claim-suppressed-reaction:${reaction.id}`, () =>
    prisma.postReaction.deleteMany({ where: { id: reaction.id } }),
  );
  assert.ok(reaction.notificationClaimedAt);
  assert.equal(
    await prisma.notification.count({
      where: { sourceKey: `REACTION:POST:${reaction.id}` },
    }),
    0,
  );

  await prisma.user.update({
    where: { id: author.id },
    data: { status: UserStatus.ACTIVE },
  });
  await ReactionService.savePostReaction(post.id, actor(reactor), {
    reactionType: ReactionType.LOVE,
  });
  const after = await prisma.postReaction.findUniqueOrThrow({
    where: { id: reaction.id },
  });
  assert.equal(
    after.notificationClaimedAt?.getTime(),
    reaction.notificationClaimedAt.getTime(),
  );
  assert.equal(
    await prisma.notification.count({
      where: { sourceKey: `REACTION:POST:${reaction.id}` },
    }),
    0,
  );
});

test("Concurrent Reaction mutations converge on one relationship and claim", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "claim-concurrent-author",
  });
  const reactor = await createTestUser({
    cleanup,
    runId,
    label: "claim-concurrent-reactor",
  });
  const post = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
  });
  const initial = await Promise.all([
    ReactionService.savePostReaction(post.id, actor(reactor), {
      reactionType: ReactionType.LIKE,
    }),
    ReactionService.savePostReaction(post.id, actor(reactor), {
      reactionType: ReactionType.LOVE,
    }),
  ]);
  assert.equal(new Set(initial.map((item) => item.id)).size, 1);
  const row = await prisma.postReaction.findUniqueOrThrow({
    where: { userId_postId: { userId: reactor.id, postId: post.id } },
  });
  cleanup.add(`claim-concurrent-reaction:${row.id}`, () =>
    prisma.postReaction.deleteMany({ where: { id: row.id } }),
  );
  assert.ok(row.notificationClaimedAt);
  const event = await prisma.notification.findUniqueOrThrow({
    where: { sourceKey: `REACTION:POST:${row.id}` },
  });
  cleanup.add(`claim-concurrent-notification:${event.id}`, () =>
    prisma.notification.deleteMany({ where: { id: event.id } }),
  );
  assert.equal(
    await prisma.notification.count({
      where: { sourceKey: `REACTION:POST:${row.id}` },
    }),
    1,
  );

  await prisma.notification.deleteMany({ where: { id: event.id } });
  await prisma.postReaction.update({
    where: { id: row.id },
    data: { notificationClaimedAt: null, reactionType: ReactionType.LIKE },
  });
  const updates = await Promise.all([
    ReactionService.savePostReaction(post.id, actor(reactor), {
      reactionType: ReactionType.LOVE,
    }),
    ReactionService.savePostReaction(post.id, actor(reactor), {
      reactionType: ReactionType.INSIGHTFUL,
    }),
  ]);
  assert.equal(
    updates.every((item) => item.id === row.id),
    true,
  );
  const final = await prisma.postReaction.findUniqueOrThrow({
    where: { id: row.id },
  });
  assert.ok(final.notificationClaimedAt);
  assert.equal(
    ([ReactionType.LOVE, ReactionType.INSIGHTFUL] as ReactionType[]).includes(
      final.reactionType,
    ),
    true,
  );
  const secondEvent = await prisma.notification.findUniqueOrThrow({
    where: { sourceKey: `REACTION:POST:${row.id}` },
  });
  cleanup.add(`claim-concurrent-notification-second:${secondEvent.id}`, () =>
    prisma.notification.deleteMany({ where: { id: secondEvent.id } }),
  );
  assert.equal(
    await prisma.notification.count({
      where: { sourceKey: `REACTION:POST:${row.id}` },
    }),
    1,
  );
});

test("Community role no-ops suppress events while legitimate cycles remain visible", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "role-owner" });
  const member = await createTestUser({ cleanup, runId, label: "role-member" });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "notification-role",
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: member.id,
  });

  for (const role of [
    CommunityMemberRole.MODERATOR,
    CommunityMemberRole.MODERATOR,
    CommunityMemberRole.MEMBER,
    CommunityMemberRole.MODERATOR,
  ]) {
    await CommunityMemberService.updateMemberRole(
      community.id,
      member.id,
      actor(owner),
      { role },
    );
  }

  const events = await prisma.notification.findMany({
    where: {
      receiverId: member.id,
      type: NotificationType.COMMUNITY_ROLE_UPDATE,
    },
  });
  assert.equal(events.length, 3);
  events.forEach((event) =>
    cleanup.add(`role-notification:${event.id}`, () =>
      prisma.notification.deleteMany({ where: { id: event.id } }),
    ),
  );
});

test("Concurrent Community role requests converge without false success", async () => {
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "role-race-owner",
  });
  const sameMember = await createTestUser({
    cleanup,
    runId,
    label: "role-race-same-member",
  });
  const differentMember = await createTestUser({
    cleanup,
    runId,
    label: "role-race-different-member",
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "notification-role-races",
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: sameMember.id,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: differentMember.id,
  });

  const sameResults = await Promise.all([
    CommunityMemberService.updateMemberRole(
      community.id,
      sameMember.id,
      actor(owner),
      { role: CommunityMemberRole.MODERATOR },
    ),
    CommunityMemberService.updateMemberRole(
      community.id,
      sameMember.id,
      actor(owner),
      { role: CommunityMemberRole.MODERATOR },
    ),
  ]);
  assert.equal(
    sameResults.every(
      (result) => result.role === CommunityMemberRole.MODERATOR,
    ),
    true,
  );
  assert.equal(
    await prisma.notification.count({
      where: {
        receiverId: sameMember.id,
        type: NotificationType.COMMUNITY_ROLE_UPDATE,
      },
    }),
    1,
  );

  const requestedRoles = [
    CommunityMemberRole.MODERATOR,
    CommunityMemberRole.ADMIN,
  ] as const;
  const differentResults = await Promise.all(
    requestedRoles.map((role) =>
      CommunityMemberService.updateMemberRole(
        community.id,
        differentMember.id,
        actor(owner),
        { role },
      ),
    ),
  );
  assert.deepEqual(
    differentResults.map((result) => result.role),
    requestedRoles,
  );

  const events = await prisma.notification.findMany({
    where: {
      receiverId: { in: [sameMember.id, differentMember.id] },
      type: NotificationType.COMMUNITY_ROLE_UPDATE,
    },
  });
  events.forEach((event) =>
    cleanup.add(`role-race-notification:${event.id}`, () =>
      prisma.notification.deleteMany({ where: { id: event.id } }),
    ),
  );
});

test("Eligible Notification writer failure rolls back Post creation", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "rollback-author",
  });
  const receiver = await createTestUser({
    cleanup,
    runId,
    label: "rollback-receiver",
  });
  const content = `${runId} rollback notification`;
  const originalError = new Error("notification unavailable");
  const mutation = createPostMutationService({
    createPostResponseService: () => ({
      enrichPost: async () => {
        throw new Error("Post enrichment should not run");
      },
      enrichPosts: async () => [],
    }),
    createNotificationWriter: () => ({
      writeEvents: async () => {
        throw originalError;
      },
    }),
    mediaService: {
      validateFiles: () => undefined,
      uploadFiles: async () => [],
      safeCleanupUploadedMedia: async () => undefined,
    },
  });

  await assert.rejects(
    mutation.create(actor(author), {
      content,
      mentionedUserIds: [receiver.id],
    }),
    (error) => error === originalError,
  );
  assert.equal(await prisma.post.count({ where: { content } }), 0);
});
