import assert from "node:assert/strict";
import test from "node:test";
import { NotificationType } from "../../../../src/generated/prisma/client";
import { createNotificationWriter } from "../../../../src/app/shared/notifications/notification-writer.factory";
import { getCanonicalNotificationMessage } from "../../../../src/app/shared/notifications/notification-message";
import { NotificationTargetType } from "../../../../src/generated/prisma/client";

test("Notification writer suppresses self and unavailable receivers", async () => {
  const writes: unknown[][] = [];
  const writer = createNotificationWriter({
    findEligibleReceiverIds: async () => ["active"],
    createNotifications: async (data) => {
      writes.push(data);
    },
  });
  await writer.writeEvents([
    {
      type: NotificationType.FOLLOW,
      senderId: "self",
      receiverId: "self",
      sourceKey: "FOLLOW:self",
      target: null,
    },
    {
      type: NotificationType.FOLLOW,
      senderId: "sender",
      receiverId: "inactive",
      sourceKey: "FOLLOW:inactive",
      target: null,
    },
  ]);
  assert.deepEqual(writes, []);
});

test("Notification writer derives actor-neutral structural rows", async () => {
  let written: Array<Record<string, unknown>> = [];
  const writer = createNotificationWriter({
    findEligibleReceiverIds: async (ids) => ids,
    createNotifications: async (data) => {
      written = data;
    },
  });
  await writer.writeEvents([
    {
      type: NotificationType.REACTION,
      senderId: "sender",
      receiverId: "receiver",
      sourceKey: "REACTION:COMMENT:1",
      target: { type: "COMMENT", id: "comment", postId: "post" },
    },
  ]);
  assert.equal(written.length, 1);
  assert.equal(written[0].message, "reacted to your comment");
  assert.equal(written[0].commentId, "comment");
  assert.equal(written[0].postId, "post");
  assert.equal(JSON.stringify(written).includes("sender name"), false);
});

test("Notification writer preserves eligible infrastructure error identity", async () => {
  const original = new Error("database unavailable");
  const writer = createNotificationWriter({
    findEligibleReceiverIds: async (ids) => ids,
    createNotifications: async () => {
      throw original;
    },
  });
  await assert.rejects(
    writer.writeEvents([
      {
        type: NotificationType.FOLLOW,
        senderId: "sender",
        receiverId: "receiver",
        sourceKey: "FOLLOW:1",
        target: null,
      },
    ]),
    (error) => error === original,
  );
});

test("Notification messages use a defensive Reaction fallback", () => {
  assert.equal(
    getCanonicalNotificationMessage(
      NotificationType.REACTION,
      NotificationTargetType.COMMENT,
    ),
    "reacted to your comment",
  );
  assert.equal(
    getCanonicalNotificationMessage(NotificationType.REACTION, null),
    "reacted to your content",
  );
});
