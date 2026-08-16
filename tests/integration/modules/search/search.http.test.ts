import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityVisibility,
  PostVisibility,
  UserStatus,
} from "../../../../src/generated/prisma/client";
import app from "../../../../src/app";
import { prisma } from "../../../../src/app/lib/prisma";
import { CommunityService } from "../../../../src/app/module/community/community.service";
import { installAuthSessionStub } from "../../../support/auth/auth-session.stub";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestCommunityWithOwnerMembership } from "../../../support/fixtures/community.fixture";
import { createTestCommunityMember } from "../../../support/fixtures/community-member.fixture";
import { createTestFollow } from "../../../support/fixtures/follow.fixture";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";
import { startTestServer } from "../../../support/server/test-server";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId)
  throw new Error("TEST_RUN_ID is required; use the integration runner");

const runId = `${testRunId}-search-http`;
const cleanup = createTestCleanup();
const token = `search${runId.replace(/[^a-z0-9]/gi, "").slice(-24)}`;
let userId = "";
let publicPostId = "";
let privatePostId = "";
let publicCommunityId = "";
let privateCommunityId = "";
let hashtagId = "";
let hiddenHashtagId = "";
let exactRankPostId = "";
let prefixRankPostId = "";
let containsRankPostId = "";
let percentNegativePostId = "";
let underscoreNegativePostId = "";
let backslashNegativePostId = "";
let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let restoreAuth: (() => void) | undefined;

const request = async (path: string, authenticatedUserId?: string) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: authenticatedUserId
      ? { "x-test-user-id": authenticatedUserId }
      : undefined,
  });
  return { status: response.status, body: await response.json() };
};

before(async () => {
  const user = await createTestUser({
    cleanup,
    runId,
    label: `${token}-owner`,
  });
  userId = user.id;
  await prisma.profile.create({
    data: {
      userId,
      username: `${token}user`.slice(0, 40),
      headline: `${token} engineer`,
      profession: `${token} developer`,
      company: `${token} labs`,
    },
  });

  const hashtag = await prisma.hashtag.create({
    data: { name: `${token}tag`.toLowerCase(), postCount: 999_999 },
  });
  hashtagId = hashtag.id;
  cleanup.add(`hashtag:${hashtag.id}`, () =>
    prisma.hashtag.deleteMany({ where: { id: hashtag.id } }),
  );
  const hiddenHashtag = await prisma.hashtag.create({
    data: { name: `${token}hidden`.toLowerCase(), postCount: 999_999 },
  });
  hiddenHashtagId = hiddenHashtag.id;
  cleanup.add(`hashtag:${hiddenHashtag.id}`, () =>
    prisma.hashtag.deleteMany({ where: { id: hiddenHashtag.id } }),
  );

  const publicPost = await createTestPost({
    cleanup,
    runId,
    authorId: userId,
    content: `${token} exact content with 100% and foo_bar and slash\\path`,
  });
  publicPostId = publicPost.id;
  const percentNegativePost = await createTestPost({
    cleanup,
    runId: `${runId}-literal-percent-negative`,
    authorId: userId,
    content: "100X TypeScript",
  });
  percentNegativePostId = percentNegativePost.id;
  const underscoreNegativePost = await createTestPost({
    cleanup,
    runId: `${runId}-literal-underscore-negative`,
    authorId: userId,
    content: "fooXbar",
  });
  underscoreNegativePostId = underscoreNegativePost.id;
  const backslashNegativePost = await createTestPost({
    cleanup,
    runId: `${runId}-literal-backslash-negative`,
    authorId: userId,
    content: "slashXpath",
  });
  backslashNegativePostId = backslashNegativePost.id;
  const privatePost = await createTestPost({
    cleanup,
    runId: `${runId}-private`,
    authorId: userId,
    visibility: PostVisibility.PRIVATE,
    content: `${token} private content`,
  });
  privatePostId = privatePost.id;
  await prisma.postHashtag.createMany({
    data: [
      { postId: publicPost.id, hashtagId: hashtag.id },
      { postId: privatePost.id, hashtagId: hashtag.id },
      { postId: privatePost.id, hashtagId: hiddenHashtag.id },
    ],
  });

  const rankTerm = `${token}rank`.toLowerCase();
  const rankHashtag = await prisma.hashtag.create({ data: { name: rankTerm } });
  cleanup.add(`hashtag:${rankHashtag.id}`, () =>
    prisma.hashtag.deleteMany({ where: { id: rankHashtag.id } }),
  );
  const exactRankPost = await createTestPost({
    cleanup,
    runId: `${runId}-rank-exact`,
    authorId: userId,
    content: "relation exact match",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  exactRankPostId = exactRankPost.id;
  await prisma.postHashtag.create({
    data: { postId: exactRankPost.id, hashtagId: rankHashtag.id },
  });
  const prefixRankPost = await createTestPost({
    cleanup,
    runId: `${runId}-rank-prefix`,
    authorId: userId,
    content: `${rankTerm} guide`,
    createdAt: new Date("2026-02-01T00:00:00.000Z"),
  });
  prefixRankPostId = prefixRankPost.id;
  const containsRankPost = await createTestPost({
    cleanup,
    runId: `${runId}-rank-contains`,
    authorId: userId,
    content: `learn ${rankTerm} today`,
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
  });
  containsRankPostId = containsRankPost.id;

  const publicCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: userId,
    label: `${token}-public`,
  });
  publicCommunityId = publicCommunity.id;
  await prisma.community.update({
    where: { id: publicCommunity.id },
    data: { description: `${token} community description` },
  });
  const privateCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: userId,
    label: `${token}-private`,
    visibility: CommunityVisibility.PRIVATE,
  });
  privateCommunityId = privateCommunity.id;

  restoreAuth = installAuthSessionStub(`${runId}-session`);
  const server = await startTestServer(app);
  baseUrl = server.baseUrl;
  closeServer = server.close;
});

after(async () => {
  restoreAuth?.();
  await closeServer?.();
  await cleanup.run();
});

test("Global Search returns all grouped sections and typed Search returns one", async () => {
  const global = await request(
    `/api/v1/search?query=${encodeURIComponent(token)}`,
  );
  assert.equal(global.status, 200);
  assert.deepEqual(Object.keys(global.body.data), [
    "users",
    "posts",
    "communities",
    "hashtags",
  ]);
  assert.ok(
    global.body.data.users.data.some(
      (item: { id: string }) => item.id === userId,
    ),
  );
  assert.ok(
    global.body.data.posts.data.some(
      (item: { id: string }) => item.id === publicPostId,
    ),
  );
  assert.ok(
    global.body.data.communities.data.some(
      (item: { id: string }) => item.id === publicCommunityId,
    ),
  );

  const typed = await request(
    `/api/v1/search?query=${encodeURIComponent(token)}&type=POST`,
  );
  assert.equal(typed.status, 200);
  assert.deepEqual(Object.keys(typed.body.data), ["posts"]);
});

test("Dedicated Search routes preserve canonical public DTOs and visibility", async () => {
  const users = await request(
    `/api/v1/search/users?query=${encodeURIComponent(token)}`,
  );
  assert.equal(users.status, 200);
  const matchedUser = users.body.data.find(
    (item: { id: string }) => item.id === userId,
  );
  assert.ok(matchedUser);
  assert.equal("email" in matchedUser, false);
  assert.equal("status" in matchedUser, false);

  const guestPosts = await request(
    `/api/v1/search/posts?query=${encodeURIComponent(token)}`,
  );
  assert.equal(guestPosts.status, 200);
  assert.ok(
    guestPosts.body.data.some(
      (item: { id: string }) => item.id === publicPostId,
    ),
  );
  assert.equal(
    guestPosts.body.data.some(
      (item: { id: string }) => item.id === privatePostId,
    ),
    false,
  );

  const ownerPosts = await request(
    `/api/v1/search/posts?query=${encodeURIComponent(token)}`,
    userId,
  );
  assert.ok(
    ownerPosts.body.data.some(
      (item: { id: string }) => item.id === privatePostId,
    ),
  );

  const guestCommunities = await request(
    `/api/v1/search/communities?query=${encodeURIComponent(token)}`,
  );
  assert.ok(
    guestCommunities.body.data.some(
      (item: { id: string }) => item.id === publicCommunityId,
    ),
  );
  assert.equal(
    guestCommunities.body.data.some(
      (item: { id: string }) => item.id === privateCommunityId,
    ),
    false,
  );

  const ownerCommunities = await request(
    `/api/v1/search/communities?query=${encodeURIComponent(token)}`,
    userId,
  );
  assert.ok(
    ownerCommunities.body.data.some(
      (item: { id: string }) => item.id === privateCommunityId,
    ),
  );
});

test("User Search matches each public field and excludes unavailable or email-only accounts", async () => {
  const suffix = runId.replace(/[^a-z0-9]/gi, "").slice(-10).toLowerCase();
  const cases = [
    { field: "name", query: `nm${suffix}` },
    { field: "username", query: `un${suffix}` },
    { field: "headline", query: `hl${suffix}` },
    { field: "profession", query: `pr${suffix}` },
    { field: "company", query: `co${suffix}` },
  ] as const;

  for (const [index, item] of cases.entries()) {
    const user = await createTestUser({
      cleanup,
      runId: `${runId}-field-${index}`,
      label: item.field === "name" ? item.query : `field-${index}`,
    });
    await prisma.profile.create({
      data: {
        userId: user.id,
        username:
          item.field === "username" ? item.query : `profile${suffix}${index}`,
        ...(item.field === "headline" && { headline: item.query }),
        ...(item.field === "profession" && { profession: item.query }),
        ...(item.field === "company" && { company: item.query }),
      },
    });

    const result = await request(
      `/api/v1/search/users?query=${encodeURIComponent(item.query.toUpperCase())}`,
    );
    assert.equal(result.status, 200);
    const matched = result.body.data.find(
      (candidate: { id: string }) => candidate.id === user.id,
    );
    assert.ok(matched, item.field);
    assert.equal("email" in matched, false);
    assert.equal("role" in matched, false);
    assert.equal("status" in matched, false);
  }

  const unavailableQuery = `off${suffix}`;
  const unavailableUsers = await Promise.all([
    createTestUser({
      cleanup,
      runId: `${runId}-suspended`,
      label: `${unavailableQuery}-suspended`,
      status: UserStatus.SUSPENDED,
    }),
    createTestUser({
      cleanup,
      runId: `${runId}-deleted-status`,
      label: `${unavailableQuery}-deleted-status`,
      status: UserStatus.DELETED,
    }),
    createTestUser({
      cleanup,
      runId: `${runId}-deleted-at`,
      label: `${unavailableQuery}-deleted-at`,
      deletedAt: new Date(),
    }),
  ]);
  const emailOnlyQuery = `emailonly${suffix}`;
  const emailOnlyUser = await createTestUser({
    cleanup,
    runId: emailOnlyQuery,
    label: "account-with-unrelated-public-fields",
  });

  const unavailableResult = await request(
    `/api/v1/search/users?query=${encodeURIComponent(unavailableQuery)}`,
  );
  const unavailableIds = new Set(
    unavailableResult.body.data.map((item: { id: string }) => item.id),
  );
  for (const user of unavailableUsers) {
    assert.equal(unavailableIds.has(user.id), false);
  }

  const emailResult = await request(
    `/api/v1/search/users?query=${encodeURIComponent(emailOnlyQuery)}`,
  );
  assert.equal(
    emailResult.body.data.some(
      (item: { id: string }) => item.id === emailOnlyUser.id,
    ),
    false,
  );
});

test("Post Search applies viewer, follow, Community, and author availability policies", async () => {
  const searchTerm = `policy${runId.replace(/[^a-z0-9]/gi, "").slice(-12)}`;
  const follower = await createTestUser({
    cleanup,
    runId: `${runId}-follower`,
    label: "follower",
  });
  const unrelated = await createTestUser({
    cleanup,
    runId: `${runId}-unrelated`,
    label: "unrelated",
  });
  await createTestFollow({
    cleanup,
    followerId: follower.id,
    followingId: userId,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: publicCommunityId,
    userId: follower.id,
    role: CommunityMemberRole.MEMBER,
    status: CommunityMemberStatus.ACTIVE,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: privateCommunityId,
    userId: follower.id,
    role: CommunityMemberRole.MEMBER,
    status: CommunityMemberStatus.ACTIVE,
  });

  const fixtures = {
    public: await createTestPost({
      cleanup,
      runId: `${runId}-policy-public`,
      authorId: userId,
      content: `${searchTerm} public`,
    }),
    private: await createTestPost({
      cleanup,
      runId: `${runId}-policy-private`,
      authorId: userId,
      visibility: PostVisibility.PRIVATE,
      content: `${searchTerm} private`,
    }),
    followers: await createTestPost({
      cleanup,
      runId: `${runId}-policy-followers`,
      authorId: userId,
      visibility: PostVisibility.FOLLOWERS,
      content: `${searchTerm} followers`,
    }),
    communityOnly: await createTestPost({
      cleanup,
      runId: `${runId}-policy-community`,
      authorId: userId,
      communityId: publicCommunityId,
      visibility: PostVisibility.COMMUNITY_ONLY,
      content: `${searchTerm} community only`,
    }),
    privateCommunity: await createTestPost({
      cleanup,
      runId: `${runId}-policy-private-community`,
      authorId: userId,
      communityId: privateCommunityId,
      content: `${searchTerm} private community`,
    }),
  };

  const suspendedAuthor = await createTestUser({
    cleanup,
    runId: `${runId}-post-suspended-author`,
    label: "post-suspended-author",
    status: UserStatus.SUSPENDED,
  });
  const statusDeletedAuthor = await createTestUser({
    cleanup,
    runId: `${runId}-post-status-deleted-author`,
    label: "post-status-deleted-author",
    status: UserStatus.DELETED,
  });
  const softDeletedAuthor = await createTestUser({
    cleanup,
    runId: `${runId}-post-soft-deleted-author`,
    label: "post-soft-deleted-author",
    deletedAt: new Date(),
  });
  const unavailablePosts = await Promise.all(
    [suspendedAuthor, statusDeletedAuthor, softDeletedAuthor].map(
      (author, index) =>
        createTestPost({
          cleanup,
          runId: `${runId}-unavailable-post-${index}`,
          authorId: author.id,
          content: `${searchTerm} unavailable ${index}`,
        }),
    ),
  );
  const deletedPost = await createTestPost({
    cleanup,
    runId: `${runId}-soft-deleted-post`,
    authorId: userId,
    content: `${searchTerm} deleted post`,
  });
  await prisma.post.update({
    where: { id: deletedPost.id },
    data: { isDeleted: true },
  });

  const idsFor = async (viewerId?: string) => {
    const result = await request(
      `/api/v1/search/posts?query=${encodeURIComponent(searchTerm)}`,
      viewerId,
    );
    assert.equal(result.status, 200);
    return new Set(
      result.body.data.map((item: { id: string }) => item.id as string),
    );
  };
  const guestIds = await idsFor();
  assert.equal(guestIds.has(fixtures.public.id), true);
  assert.equal(guestIds.has(fixtures.private.id), false);
  assert.equal(guestIds.has(fixtures.followers.id), false);
  assert.equal(guestIds.has(fixtures.communityOnly.id), false);
  assert.equal(guestIds.has(fixtures.privateCommunity.id), false);

  const ownerIds = await idsFor(userId);
  assert.equal(ownerIds.has(fixtures.private.id), true);
  assert.equal(ownerIds.has(fixtures.privateCommunity.id), true);

  const followerIds = await idsFor(follower.id);
  assert.equal(followerIds.has(fixtures.followers.id), true);
  assert.equal(followerIds.has(fixtures.communityOnly.id), true);
  assert.equal(followerIds.has(fixtures.privateCommunity.id), true);

  const unrelatedIds = await idsFor(unrelated.id);
  assert.equal(unrelatedIds.has(fixtures.followers.id), false);
  assert.equal(unrelatedIds.has(fixtures.communityOnly.id), false);
  assert.equal(unrelatedIds.has(fixtures.privateCommunity.id), false);
  for (const unavailable of [...unavailablePosts, deletedPost]) {
    assert.equal(ownerIds.has(unavailable.id), false);
    assert.equal(followerIds.has(unavailable.id), false);
  }
});

test("Community Search matches every field, applies readability, and preserves canonical DTOs", async () => {
  const suffix = runId.replace(/[^a-z0-9]/gi, "").slice(-10).toLowerCase();
  const owner = { id: userId } as Express.AuthenticatedUser;
  const fields = ["name", "slug", "description"] as const;

  for (const [index, field] of fields.entries()) {
    const query = `cm${index}${suffix}`;
    const created = await createTestCommunityWithOwnerMembership({
      cleanup,
      runId: `${runId}-community-field-${index}`,
      ownerId: userId,
      label: `field-${index}`,
    });
    const updated = await prisma.community.update({
      where: { id: created.id },
      data: {
        name: field === "name" ? query : `Unrelated Name ${index}`,
        slug: field === "slug" ? query : `unrelated-slug-${suffix}-${index}`,
        description: field === "description" ? query : null,
      },
    });

    const result = await request(
      `/api/v1/search/communities?query=${encodeURIComponent(query.toUpperCase())}`,
      userId,
    );
    assert.equal(result.status, 200);
    const fromSearch = result.body.data.find(
      (item: { id: string }) => item.id === created.id,
    );
    assert.ok(fromSearch, field);

    const canonical = await CommunityService.getCommunityBySlug(
      updated.slug,
      owner,
    );
    assert.deepEqual(fromSearch, JSON.parse(JSON.stringify(canonical)));
  }

  const unavailableQuery = `unavailablecommunity${suffix}`;
  const suspended = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-community-suspended`,
    ownerId: userId,
    label: unavailableQuery,
    isSuspended: true,
  });
  const deleted = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId: `${runId}-community-deleted`,
    ownerId: userId,
    label: unavailableQuery,
    deletedAt: new Date(),
  });
  const result = await request(
    `/api/v1/search/communities?query=${encodeURIComponent(unavailableQuery)}`,
    userId,
  );
  const resultIds = new Set(
    result.body.data.map((item: { id: string }) => item.id as string),
  );
  assert.equal(resultIds.has(suspended.id), false);
  assert.equal(resultIds.has(deleted.id), false);
});

test("Hashtag Search uses viewer-visible counts instead of stored postCount", async () => {
  const guest = await request(
    `/api/v1/search?query=${encodeURIComponent(`${token}tag`)}&type=HASHTAG`,
  );
  assert.equal(guest.status, 200);
  const guestTag = guest.body.data.hashtags.data.find(
    (item: { id: string }) => item.id === hashtagId,
  );
  assert.equal(guestTag.postCount, 1);

  const owner = await request(
    `/api/v1/search?query=${encodeURIComponent(`${token}tag`)}&type=HASHTAG`,
    userId,
  );
  const ownerTag = owner.body.data.hashtags.data.find(
    (item: { id: string }) => item.id === hashtagId,
  );
  assert.equal(ownerTag.postCount, 2);

  const hiddenForGuest = await request(
    `/api/v1/search?query=${encodeURIComponent(`${token}hidden`)}&type=HASHTAG`,
  );
  assert.equal(
    hiddenForGuest.body.data.hashtags.data.some(
      (item: { id: string }) => item.id === hiddenHashtagId,
    ),
    false,
  );
  const hiddenForOwner = await request(
    `/api/v1/search?query=${encodeURIComponent(`${token}hidden`)}&type=HASHTAG`,
    userId,
  );
  assert.equal(
    hiddenForOwner.body.data.hashtags.data.find(
      (item: { id: string }) => item.id === hiddenHashtagId,
    ).postCount,
    1,
  );
});

test("Post Search ranks relation exact before scalar prefix and substring", async () => {
  const result = await request(
    `/api/v1/search/posts?query=${encodeURIComponent(`${token}rank`)}`,
  );
  assert.equal(result.status, 200);
  const controlled = result.body.data
    .map((item: { id: string }) => item.id)
    .filter((id: string) =>
      [exactRankPostId, prefixRankPostId, containsRankPostId].includes(id),
    );
  assert.deepEqual(controlled, [
    exactRankPostId,
    prefixRankPostId,
    containsRankPostId,
  ]);
  assert.equal(new Set(controlled).size, 3);
});

test("Search treats SQL pattern characters literally", async () => {
  for (const [literal, excludedId] of [
    ["100%", percentNegativePostId],
    ["foo_", underscoreNegativePostId],
    ["slash\\", backslashNegativePostId],
  ] as const) {
    const result = await request(
      `/api/v1/search/posts?query=${encodeURIComponent(literal)}`,
    );
    assert.equal(result.status, 200);
    assert.ok(
      result.body.data.some((item: { id: string }) => item.id === publicPostId),
    );
    assert.equal(
      result.body.data.some((item: { id: string }) => item.id === excludedId),
      false,
    );
  }
});

test("Search HTTP query validation is strict and dedicated routes reject type", async () => {
  for (const path of [
    "/api/v1/search?query=a",
    "/api/v1/search?query=valid&page=01",
    "/api/v1/search?query=valid&limit=5&limit=10",
    "/api/v1/search?query=valid&unknown=x",
    "/api/v1/search/users?query=valid&type=USER",
  ]) {
    const result = await request(path);
    assert.equal(result.status, 400, path);
  }
});
