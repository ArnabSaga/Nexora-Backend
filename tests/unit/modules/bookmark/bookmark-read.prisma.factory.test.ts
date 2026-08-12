import assert from "node:assert/strict";
import test from "node:test";
import {
  createPrismaBookmarkReadService,
  type TBookmarkReadPrismaClient,
} from "../../../../src/app/module/bookmark/bookmark-read.prisma.factory";

test("Prisma Bookmark adapter forwards one viewer query", async () => {
  const calls: unknown[] = [];
  const client = {
    bookmark: {
      findMany: async (args: unknown) => {
        calls.push(args);
        return [{ postId: "post-b" }];
      },
    },
  } as unknown as TBookmarkReadPrismaClient;
  const service = createPrismaBookmarkReadService(client);

  const states = await service.getPostBookmarkStates(
    ["post-a", "post-b"],
    "viewer-a",
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    where: {
      userId: "viewer-a",
      postId: { in: ["post-a", "post-b"] },
    },
    select: { postId: true },
  });
  assert.equal(states.get("post-a"), false);
  assert.equal(states.get("post-b"), true);
});
