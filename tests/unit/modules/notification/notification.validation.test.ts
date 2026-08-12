import assert from "node:assert/strict";
import test from "node:test";
import { NotificationValidation } from "../../../../src/app/module/notification/notification.validation";
import {
  decodeNotificationCursor,
  encodeNotificationCursor,
} from "../../../../src/app/module/notification/notification.cursor";

const id = "ck1234567890123456789012";

test("Notification validation accepts strict list and ID boundaries", () => {
  assert.equal(NotificationValidation.idParam.parse({ id }).id, id);
  assert.deepEqual(
    NotificationValidation.listQuery.parse({ limit: "50", isRead: "false" }),
    { limit: 50, isRead: false },
  );
  const cursor = encodeNotificationCursor({
    createdAt: "2026-08-12T12:00:00.000Z",
    id,
  });
  assert.equal(decodeNotificationCursor(cursor)?.id, id);
});

test("Notification validation rejects unsafe queries and cursors", () => {
  for (const query of [
    { limit: "51" },
    { limit: "01" },
    { isRead: "1" },
    { extra: "true" },
  ]) {
    assert.throws(() => NotificationValidation.listQuery.parse(query));
  }
  assert.throws(() => decodeNotificationCursor("not+base64"));
  assert.throws(() => NotificationValidation.idParam.parse({ id: ` ${id}` }));
});

test("Notification empty body accepts omission but remains strict", () => {
  assert.deepEqual(NotificationValidation.emptyBody.parse(undefined), {});
  assert.deepEqual(NotificationValidation.emptyBody.parse({}), {});
  for (const body of [null, [], { extra: true }]) {
    assert.throws(() => NotificationValidation.emptyBody.parse(body));
  }
  assert.deepEqual(NotificationValidation.emptyQuery.parse({}), {});
  assert.throws(() =>
    NotificationValidation.emptyQuery.parse({ extra: "true" }),
  );
});
