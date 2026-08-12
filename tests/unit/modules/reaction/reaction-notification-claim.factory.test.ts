import assert from "node:assert/strict";
import test from "node:test";
import { NotificationType } from "../../../../src/generated/prisma/client";
import { createReactionNotificationClaimService } from "../../../../src/app/module/reaction/reaction-notification-claim.factory";

const event = {
  type: NotificationType.REACTION,
  senderId: "sender",
  receiverId: "receiver",
  sourceKey: "REACTION:POST:reaction",
  target: { type: "POST" as const, id: "post" },
};

test("Reaction notification claim skips the writer after consumption", async () => {
  let writes = 0;
  const service = createReactionNotificationClaimService({
    claimNotification: async () => false,
    writeNotification: async () => {
      writes += 1;
    },
  });

  assert.equal(await service.claimAndNotify("reaction", event), false);
  assert.equal(writes, 0);
});

test("Reaction notification claim writes once after winning", async () => {
  let writes = 0;
  const service = createReactionNotificationClaimService({
    claimNotification: async () => true,
    writeNotification: async () => {
      writes += 1;
    },
  });

  assert.equal(await service.claimAndNotify("reaction", event), true);
  assert.equal(writes, 1);
});

test("Reaction notification claim preserves writer error identity", async () => {
  const original = new Error("notification unavailable");
  const service = createReactionNotificationClaimService({
    claimNotification: async () => true,
    writeNotification: async () => {
      throw original;
    },
  });

  await assert.rejects(
    service.claimAndNotify("reaction", event),
    (error) => error === original,
  );
});
