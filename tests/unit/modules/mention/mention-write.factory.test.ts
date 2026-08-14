import assert from "node:assert/strict";
import test from "node:test";
import AppError from "../../../../src/app/shared/errors/AppError";
import type { TInsertedMention } from "../../../../src/app/module/mention";
import { createMentionWriter } from "../../../../src/app/module/mention/mention-write.factory";

const buildWriter = (
  overrides: Partial<Parameters<typeof createMentionWriter>[0]> = {},
) => {
  const calls = {
    eligibility: 0,
    clear: 0,
    creates: 0,
    deleted: [] as string[],
  };
  const dependencies: Parameters<typeof createMentionWriter>[0] = {
    findEligibleUserIds: async (ids) => {
      calls.eligibility += 1;
      return ids;
    },
    findMentions: async () => [],
    clearMentions: async () => {
      calls.clear += 1;
    },
    deleteMentions: async (_target, _targetId, ids) => {
      calls.deleted.push(...ids);
    },
    createMentions: async (_target, _targetId, ids) => {
      calls.creates += 1;
      return ids.map((mentionedUserId, index) => ({
        id: `cinserted${index}`,
        mentionedUserId,
      }));
    },
    ...overrides,
  };

  return { writer: createMentionWriter(dependencies), calls };
};

test("Mention writer clears without an eligibility query", async () => {
  const { writer, calls } = buildWriter();
  assert.deepEqual(await writer.syncPost("cpost", []), []);
  assert.equal(calls.clear, 1);
  assert.equal(calls.eligibility, 0);
});

test("Mention writer validates before writes and rejects unavailable users", async () => {
  let writes = 0;
  const { writer } = buildWriter({
    findEligibleUserIds: async () => [],
    deleteMentions: async () => {
      writes += 1;
    },
    createMentions: async () => {
      writes += 1;
      return [];
    },
  });

  await assert.rejects(
    () => writer.syncPost("cpost", ["cmentionuser"]),
    (error: unknown) =>
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.message === "One or more mentioned users are invalid",
  );
  assert.equal(writes, 0);
});

test("Mention writer replaces obsolete rows and returns physical insertions in requested order", async () => {
  const inserted: TInsertedMention[] = [
    { id: "csecondrow", mentionedUserId: "csecond" },
    { id: "cfirstrow", mentionedUserId: "cfirstuser" },
  ];
  const { writer, calls } = buildWriter({
    findMentions: async () => [
      { id: "ckeptrow", mentionedUserId: "ckeptuser" },
      { id: "cremovedrow", mentionedUserId: "cremoved" },
    ],
    createMentions: async () => inserted,
  });

  const result = await writer.syncComment("ccomment", [
    "cfirstuser",
    "ckeptuser",
    "csecond",
  ]);

  assert.deepEqual(calls.deleted, ["cremoved"]);
  assert.deepEqual(result, [inserted[1], inserted[0]]);
});

test("Mention writer performs no relationship writes for an identical set", async () => {
  const { writer, calls } = buildWriter({
    findMentions: async () => [
      { id: "cfirstrow", mentionedUserId: "cfirstuser" },
      { id: "csecondrow", mentionedUserId: "csecond" },
    ],
  });

  assert.deepEqual(
    await writer.syncPost("cpost", ["cfirstuser", "csecond"]),
    [],
  );
  assert.equal(calls.clear, 0);
  assert.equal(calls.creates, 0);
  assert.deepEqual(calls.deleted, []);
});

test("Mention writer preserves collaborator error identity", async () => {
  const original = new Error("database unavailable");
  const { writer } = buildWriter({
    findEligibleUserIds: async () => {
      throw original;
    },
  });

  await assert.rejects(
    () => writer.syncPost("cpost", ["cmentionuser"]),
    (error) => error === original,
  );
});
