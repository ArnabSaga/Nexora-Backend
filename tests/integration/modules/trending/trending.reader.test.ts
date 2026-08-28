import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  CommunityVisibility,
  PostVisibility,
  ReactionType,
  UserStatus,
  VoteType,
} from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import { createConsistentPrismaTrendingReader } from "../../../../src/app/module/trending/trending-consistent.prisma.factory";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestComment } from "../../../support/fixtures/comment.fixture";
import { createTestCommunity } from "../../../support/fixtures/community.fixture";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestPostReaction } from "../../../support/fixtures/reaction.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId) {
  throw new Error("TEST_RUN_ID is required; use the integration runner");
}

const runId = `${testRunId}-trending-reader`;
const windowStart = new Date("2035-01-01T00:00:00.000Z");
const windowEnd = new Date("2035-01-08T00:00:00.000Z");
const sameTime = new Date("2035-01-04T00:00:00.000Z");
const reader = createConsistentPrismaTrendingReader(prisma);

const read = (page = 1, limit = 50) =>
  reader.getTrendingPosts({ page, limit, windowStart, windowEnd });

const addVote = async (
  cleanup: ReturnType<typeof createTestCleanup>,
  postId: string,
  label: string,
) => {
  const voter = await createTestUser({ cleanup, runId, label });
  const vote = await prisma.postVote.create({
    data: { userId: voter.id, postId, voteType: VoteType.UPVOTE },
  });
  cleanup.add(`vote:${vote.id}`, () =>
    prisma.postVote.deleteMany({ where: { id: vote.id } }),
  );
};

const addReaction = async (
  cleanup: ReturnType<typeof createTestCleanup>,
  postId: string,
  label: string,
) => {
  const reactor = await createTestUser({ cleanup, runId, label });
  await createTestPostReaction({
    cleanup,
    userId: reactor.id,
    postId,
    reactionType: ReactionType.LIKE,
  });
};

after(async () => {
  await prisma.$disconnect();
});

test("Trending reader applies exact window and complete public visibility", async () => {
  const cleanup = createTestCleanup();
  try {
    const active = await createTestUser({
      cleanup,
      runId,
      label: "visible-active",
    });
    const suspended = await createTestUser({
      cleanup,
      runId,
      label: "visible-suspended",
      status: UserStatus.SUSPENDED,
    });
    const deleted = await createTestUser({
      cleanup,
      runId,
      label: "visible-deleted",
      deletedAt: new Date(),
    });
    const publicCommunity = await createTestCommunity({
      cleanup,
      runId,
      ownerId: active.id,
      label: "visible-public",
      visibility: CommunityVisibility.PUBLIC,
    });
    const restrictedCommunity = await createTestCommunity({
      cleanup,
      runId,
      ownerId: active.id,
      label: "visible-restricted",
      visibility: CommunityVisibility.RESTRICTED,
    });
    const privateCommunity = await createTestCommunity({
      cleanup,
      runId,
      ownerId: active.id,
      label: "visible-private",
      visibility: CommunityVisibility.PRIVATE,
    });
    const suspendedCommunity = await createTestCommunity({
      cleanup,
      runId,
      ownerId: active.id,
      label: "visible-suspended-community",
      isSuspended: true,
    });
    const deletedCommunity = await createTestCommunity({
      cleanup,
      runId,
      ownerId: active.id,
      label: "visible-deleted-community",
      deletedAt: new Date(),
    });

    const included = await Promise.all([
      createTestPost({
        cleanup,
        runId: `${runId}-start`,
        authorId: active.id,
        createdAt: windowStart,
      }),
      createTestPost({
        cleanup,
        runId: `${runId}-end`,
        authorId: active.id,
        createdAt: windowEnd,
      }),
      createTestPost({
        cleanup,
        runId: `${runId}-public-community`,
        authorId: active.id,
        communityId: publicCommunity.id,
        createdAt: sameTime,
      }),
      createTestPost({
        cleanup,
        runId: `${runId}-restricted-community`,
        authorId: active.id,
        communityId: restrictedCommunity.id,
        createdAt: sameTime,
      }),
    ]);
    const excluded = await Promise.all([
      createTestPost({
        cleanup,
        runId: `${runId}-before`,
        authorId: active.id,
        createdAt: new Date(windowStart.getTime() - 1),
      }),
      createTestPost({
        cleanup,
        runId: `${runId}-after`,
        authorId: active.id,
        createdAt: new Date(windowEnd.getTime() + 1),
      }),
      createTestPost({
        cleanup,
        runId: `${runId}-private-post`,
        authorId: active.id,
        visibility: PostVisibility.PRIVATE,
        createdAt: sameTime,
      }),
      createTestPost({
        cleanup,
        runId: `${runId}-followers-post`,
        authorId: active.id,
        visibility: PostVisibility.FOLLOWERS,
        createdAt: sameTime,
      }),
      createTestPost({
        cleanup,
        runId: `${runId}-community-only-post`,
        authorId: active.id,
        visibility: PostVisibility.COMMUNITY_ONLY,
        communityId: publicCommunity.id,
        createdAt: sameTime,
      }),
      createTestPost({
        cleanup,
        runId: `${runId}-private-community`,
        authorId: active.id,
        communityId: privateCommunity.id,
        createdAt: sameTime,
      }),
      createTestPost({
        cleanup,
        runId: `${runId}-suspended-community`,
        authorId: active.id,
        communityId: suspendedCommunity.id,
        createdAt: sameTime,
      }),
      createTestPost({
        cleanup,
        runId: `${runId}-deleted-community`,
        authorId: active.id,
        communityId: deletedCommunity.id,
        createdAt: sameTime,
      }),
      createTestPost({
        cleanup,
        runId: `${runId}-suspended-author`,
        authorId: suspended.id,
        createdAt: sameTime,
      }),
      createTestPost({
        cleanup,
        runId: `${runId}-deleted-author`,
        authorId: deleted.id,
        createdAt: sameTime,
      }),
    ]);
    const softDeleted = await createTestPost({
      cleanup,
      runId: `${runId}-soft-deleted`,
      authorId: active.id,
      createdAt: sameTime,
    });
    await prisma.post.update({
      where: { id: softDeleted.id },
      data: { isDeleted: true },
    });

    const result = await read();
    assert.equal(result.meta.total, included.length);
    assert.deepEqual(
      new Set(result.data.map(({ id }) => id)),
      new Set(included.map(({ id }) => id)),
    );
    const returned = new Set(result.data.map(({ id }) => id));
    for (const post of [...excluded, softDeleted]) {
      assert.equal(returned.has(post.id), false, post.id);
    }
  } finally {
    await cleanup.run();
  }
});

test("Trending reader applies every ranking factor in tuple order", async () => {
  const scenarios: Array<{
    name: string;
    arrange: (
      cleanup: ReturnType<typeof createTestCleanup>,
      higherId: string,
      lowerId: string,
    ) => Promise<void>;
  }> = [
    {
      name: "reactions",
      arrange: async (cleanup, higherId, lowerId) => {
        await addReaction(cleanup, higherId, "reaction-high-1");
        await addReaction(cleanup, higherId, "reaction-high-2");
        await addReaction(cleanup, lowerId, "reaction-low-1");
      },
    },
    {
      name: "comments",
      arrange: async (cleanup, higherId, lowerId) => {
        const author = await createTestUser({
          cleanup,
          runId,
          label: "comment-ranker",
        });
        await createTestComment({
          cleanup,
          runId,
          postId: higherId,
          authorId: author.id,
          label: "high-1",
        });
        await createTestComment({
          cleanup,
          runId,
          postId: higherId,
          authorId: author.id,
          label: "high-2",
        });
        await createTestComment({
          cleanup,
          runId,
          postId: lowerId,
          authorId: author.id,
          label: "low-1",
        });
      },
    },
    {
      name: "reposts",
      arrange: async (cleanup, higherId, lowerId) => {
        const author = await createTestUser({
          cleanup,
          runId,
          label: "repost-ranker",
        });
        await createTestPost({
          cleanup,
          runId: `${runId}-repost-high-1`,
          authorId: author.id,
          repostId: higherId,
          createdAt: new Date(windowStart.getTime() - 10_000),
        });
        await createTestPost({
          cleanup,
          runId: `${runId}-repost-high-2`,
          authorId: author.id,
          repostId: higherId,
          createdAt: new Date(windowStart.getTime() - 20_000),
        });
        await createTestPost({
          cleanup,
          runId: `${runId}-repost-low-1`,
          authorId: author.id,
          repostId: lowerId,
          createdAt: new Date(windowStart.getTime() - 30_000),
        });
      },
    },
    {
      name: "votes",
      arrange: async (cleanup, higherId, lowerId) => {
        await addVote(cleanup, higherId, "vote-high-1");
        await addVote(cleanup, higherId, "vote-high-2");
        await addVote(cleanup, lowerId, "vote-low-1");
      },
    },
  ];

  for (const scenario of scenarios) {
    const cleanup = createTestCleanup();
    try {
      const author = await createTestUser({
        cleanup,
        runId,
        label: `${scenario.name}-author`,
      });
      const higher = await createTestPost({
        cleanup,
        runId: `${runId}-${scenario.name}-higher`,
        authorId: author.id,
        createdAt: sameTime,
      });
      const lower = await createTestPost({
        cleanup,
        runId: `${runId}-${scenario.name}-lower`,
        authorId: author.id,
        createdAt: sameTime,
      });
      await scenario.arrange(cleanup, higher.id, lower.id);

      const result = await read();
      assert.deepEqual(
        result.data.map(({ id }) => id),
        [higher.id, lower.id],
        scenario.name,
      );
    } finally {
      await cleanup.run();
    }
  }

  const timestampCleanup = createTestCleanup();
  try {
    const author = await createTestUser({
      cleanup: timestampCleanup,
      runId,
      label: "timestamp-author",
    });
    const newer = await createTestPost({
      cleanup: timestampCleanup,
      runId: `${runId}-timestamp-newer`,
      authorId: author.id,
      createdAt: new Date(sameTime.getTime() + 1),
    });
    const older = await createTestPost({
      cleanup: timestampCleanup,
      runId: `${runId}-timestamp-older`,
      authorId: author.id,
      createdAt: sameTime,
    });
    assert.deepEqual(
      (await read()).data.map(({ id }) => id),
      [newer.id, older.id],
    );
  } finally {
    await timestampCleanup.run();
  }

  const idCleanup = createTestCleanup();
  try {
    const author = await createTestUser({
      cleanup: idCleanup,
      runId,
      label: "id-author",
    });
    const first = await createTestPost({
      cleanup: idCleanup,
      runId: `${runId}-id-first`,
      authorId: author.id,
      createdAt: sameTime,
    });
    const second = await createTestPost({
      cleanup: idCleanup,
      runId: `${runId}-id-second`,
      authorId: author.id,
      createdAt: sameTime,
    });
    const expected = [first.id, second.id].sort((a, b) => b.localeCompare(a));
    assert.deepEqual(
      (await read()).data.map(({ id }) => id),
      expected,
    );
  } finally {
    await idCleanup.run();
  }
});

test("Trending raw deleted engagement can differ from canonical displayed counts", async () => {
  const cleanup = createTestCleanup();
  try {
    const author = await createTestUser({
      cleanup,
      runId,
      label: "raw-author",
    });
    const postA = await createTestPost({
      cleanup,
      runId: `${runId}-raw-a`,
      authorId: author.id,
      createdAt: sameTime,
    });
    const postB = await createTestPost({
      cleanup,
      runId: `${runId}-raw-b`,
      authorId: author.id,
      createdAt: sameTime,
    });
    const visibleA = await createTestComment({
      cleanup,
      runId,
      postId: postA.id,
      authorId: author.id,
      label: "visible-a",
    });
    const deletedParent = await createTestComment({
      cleanup,
      runId,
      postId: postA.id,
      authorId: author.id,
      isDeleted: true,
      label: "deleted-a",
    });
    await createTestComment({
      cleanup,
      runId,
      postId: postA.id,
      authorId: author.id,
      parentCommentId: deletedParent.id,
      label: "hidden-reply-a",
    });
    await createTestComment({
      cleanup,
      runId,
      postId: postB.id,
      authorId: author.id,
      label: "visible-b-1",
    });
    await createTestComment({
      cleanup,
      runId,
      postId: postB.id,
      authorId: author.id,
      label: "visible-b-2",
    });
    assert.ok(visibleA.id);

    const result = await read();
    assert.deepEqual(
      result.data.map(({ id }) => id),
      [postA.id, postB.id],
    );
    assert.deepEqual(
      result.data.map(({ counts }) => counts.commentsCount),
      [1, 2],
    );
  } finally {
    await cleanup.run();
  }
});

test("Trending raw repost ranking includes soft-deleted repost rows", async () => {
  const cleanup = createTestCleanup();
  try {
    const author = await createTestUser({
      cleanup,
      runId,
      label: "deleted-repost-author",
    });
    const higher = await createTestPost({
      cleanup,
      runId: `${runId}-deleted-repost-high`,
      authorId: author.id,
      createdAt: sameTime,
    });
    const lower = await createTestPost({
      cleanup,
      runId: `${runId}-deleted-repost-low`,
      authorId: author.id,
      createdAt: sameTime,
    });
    const deletedRepost = await createTestPost({
      cleanup,
      runId: `${runId}-deleted-repost-row`,
      authorId: author.id,
      repostId: higher.id,
      createdAt: new Date(windowStart.getTime() - 1_000),
    });
    await prisma.post.update({
      where: { id: deletedRepost.id },
      data: { isDeleted: true },
    });

    assert.deepEqual(
      (await read()).data.map(({ id }) => id),
      [higher.id, lower.id],
    );
  } finally {
    await cleanup.run();
  }
});

test("Trending offset pagination traverses one deterministic ranked set", async () => {
  const cleanup = createTestCleanup();
  try {
    const author = await createTestUser({
      cleanup,
      runId,
      label: "pagination-author",
    });
    const posts = [];
    for (let index = 0; index < 5; index += 1) {
      posts.push(
        await createTestPost({
          cleanup,
          runId: `${runId}-page-${index}`,
          authorId: author.id,
          createdAt: new Date(sameTime.getTime() + (5 - index) * 1_000),
        }),
      );
    }
    const expected = posts.map(({ id }) => id);
    const pages = await Promise.all([1, 2, 3, 4].map((page) => read(page, 2)));

    assert.deepEqual(
      pages[0]?.data.map(({ id }) => id),
      expected.slice(0, 2),
    );
    assert.deepEqual(
      pages[1]?.data.map(({ id }) => id),
      expected.slice(2, 4),
    );
    assert.deepEqual(
      pages[2]?.data.map(({ id }) => id),
      expected.slice(4),
    );
    assert.deepEqual(pages[3]?.data, []);
    for (const [index, page] of pages.entries()) {
      assert.deepEqual(page.meta, {
        page: index + 1,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
    }
    const traversed = pages
      .slice(0, 3)
      .flatMap(({ data }) => data.map(({ id }) => id));
    assert.deepEqual(traversed, expected);
    assert.equal(new Set(traversed).size, expected.length);
  } finally {
    await cleanup.run();
  }
});
