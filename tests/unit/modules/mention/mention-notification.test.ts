import assert from "node:assert/strict";
import test from "node:test";
import {
  NotificationTargetType,
  NotificationType,
} from "../../../../src/generated/prisma/client";
import { getCanonicalNotificationMessage } from "../../../../src/app/shared/notifications/notification-message";
import {
  buildCommentMentionEvents,
  buildPostMentionEvents,
} from "../../../../src/app/module/mention";

test("Mention messages are target-specific and defensive", () => {
  assert.equal(
    getCanonicalNotificationMessage(
      NotificationType.MENTION,
      NotificationTargetType.POST,
    ),
    "mentioned you in a post",
  );
  assert.equal(
    getCanonicalNotificationMessage(
      NotificationType.MENTION,
      NotificationTargetType.COMMENT,
    ),
    "mentioned you in a comment",
  );
  assert.equal(
    getCanonicalNotificationMessage(NotificationType.MENTION, null),
    "mentioned you",
  );
});

test("Mention event builders preserve insertion order and relationship identity", () => {
  const insertedMentions = [
    { id: "cmentionrowa", mentionedUserId: "cusera" },
    { id: "cmentionrowb", mentionedUserId: "cuserb" },
    { id: "cmentionrowc", mentionedUserId: "csender" },
  ];

  const postEvents = buildPostMentionEvents({
    senderId: "csender",
    postId: "cpost",
    insertedMentions,
  });
  const commentEvents = buildCommentMentionEvents({
    senderId: "csender",
    commentId: "ccomment",
    postId: "cpost",
    insertedMentions,
  });

  assert.deepEqual(
    postEvents.map((event) => [event.receiverId, event.sourceKey]),
    [
      ["cusera", "MENTION:POST:cmentionrowa"],
      ["cuserb", "MENTION:POST:cmentionrowb"],
      ["csender", "MENTION:POST:cmentionrowc"],
    ],
  );
  assert.deepEqual(
    commentEvents.map((event) => [event.receiverId, event.sourceKey]),
    [
      ["cusera", "MENTION:COMMENT:cmentionrowa"],
      ["cuserb", "MENTION:COMMENT:cmentionrowb"],
      ["csender", "MENTION:COMMENT:cmentionrowc"],
    ],
  );
  assert.deepEqual(postEvents[2].target, { type: "POST", id: "cpost" });
  assert.deepEqual(commentEvents[2].target, {
    type: "COMMENT",
    id: "ccomment",
    postId: "cpost",
  });
});
