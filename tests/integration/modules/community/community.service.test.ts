import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityVisibility,
  PostVisibility,
} from "../../../../src/generated/prisma/client";
import { prisma } from "../../../../src/app/lib/prisma";
import { CommunityMemberService } from "../../../../src/app/module/community/community-member.service";
import { CommunityService } from "../../../../src/app/module/community/community.service";
import { CommentService } from "../../../../src/app/module/comment/comment.service";
import { COMMUNITY_MAX_PAGE } from "../../../../src/app/module/community/community.constant";
import { PostService } from "../../../../src/app/module/post/services/post.service";
import { FeedService } from "../../../../src/app/module/post/services/feed.service";
import { ReactionService } from "../../../../src/app/module/reaction/reaction.service";
import { VoteService } from "../../../../src/app/module/vote/vote.service";
import { buildReadableCommunityWhere } from "../../../../src/app/shared/policies/community.policy";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestCommunityMember } from "../../../support/fixtures/community-member.fixture";
import { createTestCommunityWithOwnerMembership } from "../../../support/fixtures/community.fixture";
import { createTestFollow } from "../../../support/fixtures/follow.fixture";
import { createTestPost } from "../../../support/fixtures/post.fixture";
import { createTestUser } from "../../../support/fixtures/user.fixture";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId)
  throw new Error("TEST_RUN_ID is required; use the integration runner");

const runId = `${testRunId}-community-service`;
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

const trackCommunity = (id: string) =>
  cleanup.add(`community-service:${id}`, () =>
    prisma.community.deleteMany({ where: { id } }),
  );
const trackPost = (id: string) =>
  cleanup.add(`community-post:${id}`, () =>
    prisma.post.deleteMany({ where: { id } }),
  );
const trackComment = (id: string) =>
  cleanup.add(`community-comment:${id}`, () =>
    prisma.comment.deleteMany({ where: { id } }),
  );

after(async () => {
  try {
    await cleanup.run();
  } finally {
    await prisma.$disconnect();
  }
});

test("Community creation atomically creates OWNER membership and reserves slug", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "create-owner" });
  const created = await CommunityService.createCommunity(actor(owner), {
    name: `${runId} Core Community`,
    visibility: CommunityVisibility.RESTRICTED,
  });
  trackCommunity(created.id);

  const memberships = await prisma.communityMember.findMany({
    where: { communityId: created.id },
  });
  assert.equal(memberships.length, 1);
  assert.equal(memberships[0].userId, owner.id);
  assert.equal(memberships[0].role, CommunityMemberRole.OWNER);
  assert.equal(memberships[0].status, CommunityMemberStatus.ACTIVE);

  await assert.rejects(
    CommunityService.createCommunity(actor(owner), {
      name: `${runId} Core Community`,
    }),
    (error: unknown) =>
      error instanceof Error &&
      error.message === "Community slug is already reserved",
  );
});

test("Join lifecycle promotes stale PENDING membership without creating another row", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "join-owner" });
  const requester = await createTestUser({
    cleanup,
    runId,
    label: "join-requester",
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "join-community",
    visibility: CommunityVisibility.RESTRICTED,
  });

  const pending = await CommunityMemberService.joinCommunity(
    community.id,
    actor(requester),
  );
  assert.equal(pending.statusCode, 202);
  assert.equal(pending.data.status, CommunityMemberStatus.PENDING);

  await CommunityService.updateCommunity(community.id, actor(owner), {
    visibility: CommunityVisibility.PUBLIC,
  });
  const active = await CommunityMemberService.joinCommunity(
    community.id,
    actor(requester),
  );
  const rows = await prisma.communityMember.findMany({
    where: { communityId: community.id, userId: requester.id },
  });

  assert.equal(active.statusCode, 200);
  assert.equal(active.data.id, pending.data.id);
  assert.equal(active.data.status, CommunityMemberStatus.ACTIVE);
  assert.equal(rows.length, 1);
});

test("Private join uses availability while normal metadata stays hidden", async () => {
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "private-owner",
  });
  const outsider = await createTestUser({
    cleanup,
    runId,
    label: "private-outsider",
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "private-community",
    visibility: CommunityVisibility.PRIVATE,
  });

  await assert.rejects(
    CommunityService.getCommunityBySlug(community.slug, actor(outsider)),
  );
  const request = await CommunityMemberService.joinCommunity(
    community.id,
    actor(outsider),
  );
  assert.equal(request.statusCode, 202);
  assert.equal(request.data.status, CommunityMemberStatus.PENDING);
  await assert.rejects(
    CommunityService.getCommunityBySlug(community.slug, actor(outsider)),
  );
});

test("Public roster and membersCount exclude suspended and soft-deleted users", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "roster-owner" });
  const active = await createTestUser({
    cleanup,
    runId,
    label: "roster-active",
  });
  const suspended = await createTestUser({
    cleanup,
    runId,
    label: "roster-suspended",
    status: "SUSPENDED",
  });
  const deleted = await createTestUser({
    cleanup,
    runId,
    label: "roster-deleted",
    deletedAt: new Date(),
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "roster-community",
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: active.id,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: suspended.id,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: deleted.id,
  });

  const detail = await CommunityService.getCommunityBySlug(community.slug);
  const roster = await CommunityMemberService.getCommunityMembers(
    community.id,
    {},
  );

  assert.equal(detail.membersCount, 2);
  assert.deepEqual(
    new Set(roster.data.map((member) => member.user.id)),
    new Set([owner.id, active.id]),
  );
  assert.equal(roster.meta.total, detail.membersCount);
});

test("Community readability composes with Post visibility", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "read-owner" });
  const member = await createTestUser({ cleanup, runId, label: "read-member" });
  const author = await createTestUser({ cleanup, runId, label: "read-author" });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "read-community",
    visibility: CommunityVisibility.RESTRICTED,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: member.id,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: author.id,
  });
  const privatePost = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    communityId: community.id,
    visibility: PostVisibility.PRIVATE,
  });
  const followersPost = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    communityId: community.id,
    visibility: PostVisibility.FOLLOWERS,
  });
  const communityOnlyPost = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    communityId: community.id,
    visibility: PostVisibility.COMMUNITY_ONLY,
  });

  await assert.rejects(PostService.getById(privatePost.id, actor(member)));
  await assert.rejects(PostService.getById(followersPost.id, actor(member)));
  await PostService.getById(communityOnlyPost.id, actor(member));
  await createTestFollow({
    cleanup,
    followerId: member.id,
    followingId: author.id,
  });
  await PostService.getById(followersPost.id, actor(member));
});

test("Participation, containment, and Community content moderation stay distinct", async () => {
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "content-owner",
  });
  const author = await createTestUser({
    cleanup,
    runId,
    label: "content-author",
  });
  const member = await createTestUser({
    cleanup,
    runId,
    label: "content-member",
  });
  const outsider = await createTestUser({
    cleanup,
    runId,
    label: "content-outsider",
  });
  const moderator = await createTestUser({
    cleanup,
    runId,
    label: "content-moderator",
  });
  const otherModerator = await createTestUser({
    cleanup,
    runId,
    label: "content-other-moderator",
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "content-community",
    visibility: CommunityVisibility.RESTRICTED,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: author.id,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: member.id,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: moderator.id,
    role: CommunityMemberRole.MODERATOR,
  });
  const otherCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "content-other-community",
  });
  await createTestCommunityMember({
    cleanup,
    communityId: otherCommunity.id,
    userId: otherModerator.id,
    role: CommunityMemberRole.MODERATOR,
  });
  const post = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    communityId: community.id,
    visibility: PostVisibility.PUBLIC,
  });

  await PostService.getById(post.id, actor(outsider));
  await assert.rejects(
    ReactionService.savePostReaction(post.id, actor(outsider), {
      reactionType: "LIKE",
    }),
  );
  const reaction = await ReactionService.savePostReaction(
    post.id,
    actor(member),
    {
      reactionType: "LIKE",
    },
  );
  cleanup.add(`community-reaction:${reaction.id}`, () =>
    prisma.postReaction.deleteMany({ where: { id: reaction.id } }),
  );
  const vote = await VoteService.savePostVote(post.id, actor(member), {
    voteType: "UPVOTE",
  });
  cleanup.add(`community-vote:${vote.id}`, () =>
    prisma.postVote.deleteMany({ where: { id: vote.id } }),
  );
  const comment = await CommentService.createComment(post.id, actor(member), {
    content: "Community comment",
  });
  trackComment(comment.id);

  await assert.rejects(PostService.delete(post.id, actor(otherModerator)));
  await assert.rejects(
    CommentService.deleteComment(comment.id, actor(otherModerator)),
  );
  await PostService.delete(post.id, actor(moderator));
  await PostService.delete(post.id, actor(moderator));
  await CommentService.deleteComment(comment.id, actor(moderator));
});

test("Member hierarchy, banned preservation, and stale-state leave remain distinct", async () => {
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "hierarchy-owner",
  });
  const admin = await createTestUser({
    cleanup,
    runId,
    label: "hierarchy-admin",
  });
  const moderator = await createTestUser({
    cleanup,
    runId,
    label: "hierarchy-moderator",
  });
  const member = await createTestUser({
    cleanup,
    runId,
    label: "hierarchy-member",
  });
  const bannedAdmin = await createTestUser({
    cleanup,
    runId,
    label: "hierarchy-banned-admin",
  });
  const bannedMember = await createTestUser({
    cleanup,
    runId,
    label: "hierarchy-banned-member",
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "hierarchy-community",
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: admin.id,
    role: CommunityMemberRole.ADMIN,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: moderator.id,
    role: CommunityMemberRole.MODERATOR,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: member.id,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: bannedAdmin.id,
    role: CommunityMemberRole.ADMIN,
    status: CommunityMemberStatus.BANNED,
  });
  const banned = await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: bannedMember.id,
    status: CommunityMemberStatus.BANNED,
  });

  await assert.rejects(
    CommunityMemberService.updateMemberStatus(
      community.id,
      bannedAdmin.id,
      actor(admin),
      { status: CommunityMemberStatus.ACTIVE },
    ),
  );
  await CommunityMemberService.removeCommunityMember(
    community.id,
    member.id,
    actor(moderator),
  );
  await assert.rejects(
    CommunityMemberService.removeCommunityMember(
      community.id,
      bannedMember.id,
      actor(owner),
    ),
  );

  await prisma.community.update({
    where: { id: community.id },
    data: { isSuspended: true },
  });
  await CommunityMemberService.leaveCommunity(community.id, actor(moderator));
  await CommunityMemberService.leaveCommunity(
    community.id,
    actor(bannedMember),
  );
  const [moderatorRow, bannedRow] = await Promise.all([
    prisma.communityMember.findUnique({
      where: {
        communityId_userId: { communityId: community.id, userId: moderator.id },
      },
    }),
    prisma.communityMember.findUnique({ where: { id: banned.id } }),
  ]);
  assert.equal(moderatorRow, null);
  assert.equal(bannedRow?.status, CommunityMemberStatus.BANNED);
});

test("Repost containment blocks PRIVATE and COMMUNITY_ONLY sources", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "repost-owner" });
  const member = await createTestUser({
    cleanup,
    runId,
    label: "repost-member",
  });
  const restricted = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "repost-restricted",
    visibility: CommunityVisibility.RESTRICTED,
  });
  const privateCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "repost-private",
    visibility: CommunityVisibility.PRIVATE,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: restricted.id,
    userId: member.id,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: privateCommunity.id,
    userId: member.id,
  });
  const restrictedPost = await createTestPost({
    cleanup,
    runId,
    authorId: owner.id,
    communityId: restricted.id,
  });
  const privatePost = await createTestPost({
    cleanup,
    runId,
    authorId: owner.id,
    communityId: privateCommunity.id,
  });
  const communityOnly = await createTestPost({
    cleanup,
    runId,
    authorId: owner.id,
    communityId: restricted.id,
    visibility: PostVisibility.COMMUNITY_ONLY,
  });

  const repost = await PostService.repost(restrictedPost.id, actor(member), {
    content: "",
  });
  trackPost(repost.id);
  await assert.rejects(
    PostService.repost(privatePost.id, actor(member), { content: "" }),
  );
  await assert.rejects(
    PostService.repost(communityOnly.id, actor(member), { content: "" }),
  );
});

test("Soft deletion is idempotent, preserves Post relation, and revokes access", async () => {
  const owner = await createTestUser({ cleanup, runId, label: "delete-owner" });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "delete-community",
  });
  const post = await createTestPost({
    cleanup,
    runId,
    authorId: owner.id,
    communityId: community.id,
  });

  await CommunityService.deleteCommunity(community.id, actor(owner));
  await CommunityService.deleteCommunity(community.id, actor(owner));
  const storedPost = await prisma.post.findUniqueOrThrow({
    where: { id: post.id },
  });
  assert.equal(storedPost.communityId, community.id);
  await assert.rejects(PostService.getById(post.id, actor(owner)));
});

test("Community-aware Post reads require current participation only for COMMUNITY_ONLY", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "read-matrix-author",
  });
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "read-matrix-owner",
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "read-matrix-community",
    visibility: CommunityVisibility.RESTRICTED,
  });
  const membership = await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: author.id,
  });
  const communityOnly = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    communityId: community.id,
    visibility: PostVisibility.COMMUNITY_ONLY,
  });
  const privatePost = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    communityId: community.id,
    visibility: PostVisibility.PRIVATE,
  });
  const followersPost = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    communityId: community.id,
    visibility: PostVisibility.FOLLOWERS,
  });
  const nonCommunityPrivate = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    visibility: PostVisibility.PRIVATE,
  });
  const nonCommunityFollowers = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    visibility: PostVisibility.FOLLOWERS,
  });
  const comment = await CommentService.createComment(
    communityOnly.id,
    actor(author),
    { content: "Membership-bound comment" },
  );
  trackComment(comment.id);

  const collectReadIds = async () => {
    const [personalized, communityFeed, myPosts] = await Promise.all([
      FeedService.getPersonalizedFeed(actor(author), { limit: 100 }),
      FeedService.getCommunityPosts(
        community.id,
        { page: 1, limit: 100 },
        actor(author),
      ),
      FeedService.getMyPosts(actor(author), { page: 1, limit: 100 }),
    ]);

    return {
      personalized: new Set(personalized.data.map((post) => post.id)),
      community: new Set(communityFeed.data.map((post) => post.id)),
      mine: new Set(myPosts.data.map((post) => post.id)),
    };
  };

  await PostService.getById(communityOnly.id, actor(author));
  await CommentService.getPostComments(
    communityOnly.id,
    { page: 1, limit: 10 },
    actor(author),
  );
  let ids = await collectReadIds();
  assert.ok(ids.personalized.has(communityOnly.id));
  assert.ok(ids.community.has(communityOnly.id));
  assert.ok(ids.mine.has(communityOnly.id));

  await prisma.communityMember.delete({ where: { id: membership.id } });

  await assert.rejects(PostService.getById(communityOnly.id, actor(author)));
  await assert.rejects(
    CommentService.getPostComments(
      communityOnly.id,
      { page: 1, limit: 10 },
      actor(author),
    ),
  );
  ids = await collectReadIds();
  for (const result of [ids.personalized, ids.community, ids.mine]) {
    assert.ok(!result.has(communityOnly.id));
    assert.ok(result.has(privatePost.id));
    assert.ok(result.has(followersPost.id));
  }
  assert.ok(ids.mine.has(nonCommunityPrivate.id));
  assert.ok(ids.mine.has(nonCommunityFollowers.id));

  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: author.id,
    status: CommunityMemberStatus.BANNED,
  });
  await assert.rejects(PostService.getById(communityOnly.id, actor(author)));
  ids = await collectReadIds();
  assert.ok(!ids.mine.has(communityOnly.id));
  assert.ok(ids.mine.has(privatePost.id));
  assert.ok(ids.mine.has(followersPost.id));
});

test("PRIVATE, suspended, and deleted Communities dominate authored Post visibility", async () => {
  const author = await createTestUser({
    cleanup,
    runId,
    label: "container-author",
  });
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "container-owner",
  });
  const privateCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "container-private",
    visibility: CommunityVisibility.PRIVATE,
  });
  const membership = await createTestCommunityMember({
    cleanup,
    communityId: privateCommunity.id,
    userId: author.id,
  });
  const privateCommunityPosts = await Promise.all(
    [
      PostVisibility.PUBLIC,
      PostVisibility.FOLLOWERS,
      PostVisibility.PRIVATE,
      PostVisibility.COMMUNITY_ONLY,
    ].map((visibility) =>
      createTestPost({
        cleanup,
        runId,
        authorId: author.id,
        communityId: privateCommunity.id,
        visibility,
      }),
    ),
  );
  await prisma.communityMember.delete({ where: { id: membership.id } });

  let myPosts = await FeedService.getMyPosts(actor(author), {
    page: 1,
    limit: 100,
  });
  const myPostIds = new Set(myPosts.data.map((post) => post.id));
  for (const post of privateCommunityPosts) {
    assert.ok(!myPostIds.has(post.id));
    await assert.rejects(PostService.getById(post.id, actor(author)));
  }

  const suspendedCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: author.id,
    label: "container-suspended",
    isSuspended: true,
  });
  const suspendedPost = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    communityId: suspendedCommunity.id,
  });
  const deletedCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: author.id,
    label: "container-deleted",
    deletedAt: new Date(),
  });
  const deletedPost = await createTestPost({
    cleanup,
    runId,
    authorId: author.id,
    communityId: deletedCommunity.id,
  });

  myPosts = await FeedService.getMyPosts(actor(author), {
    page: 1,
    limit: 100,
  });
  const unavailableIds = new Set(myPosts.data.map((post) => post.id));
  assert.ok(!unavailableIds.has(suspendedPost.id));
  assert.ok(!unavailableIds.has(deletedPost.id));
});

test("Original Post enrichment fails closed for legacy and legal Community reposts", async () => {
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "tombstone-owner",
  });
  const viewer = await createTestUser({
    cleanup,
    runId,
    label: "tombstone-viewer",
  });
  const legacyCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "tombstone-legacy",
    visibility: CommunityVisibility.RESTRICTED,
  });
  const legacyMembership = await createTestCommunityMember({
    cleanup,
    communityId: legacyCommunity.id,
    userId: viewer.id,
  });
  const communityOnlyOriginal = await createTestPost({
    cleanup,
    runId,
    authorId: owner.id,
    communityId: legacyCommunity.id,
    visibility: PostVisibility.COMMUNITY_ONLY,
  });
  const legacyRepost = await createTestPost({
    cleanup,
    runId,
    authorId: viewer.id,
    repostId: communityOnlyOriginal.id,
  });

  let response = await PostService.getById(legacyRepost.id, actor(viewer));
  assert.equal(response.originalPost?.id, communityOnlyOriginal.id);
  assert.ok(response.originalPost && !("unavailable" in response.originalPost));
  await assert.rejects(
    PostService.repost(communityOnlyOriginal.id, actor(viewer), {
      content: "",
    }),
  );

  await prisma.communityMember.delete({ where: { id: legacyMembership.id } });
  response = await PostService.getById(legacyRepost.id, actor(viewer));
  assert.deepEqual(response.originalPost, {
    id: communityOnlyOriginal.id,
    unavailable: true,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: legacyCommunity.id,
    userId: viewer.id,
    status: CommunityMemberStatus.BANNED,
  });
  response = await PostService.getById(legacyRepost.id, actor(viewer));
  assert.deepEqual(response.originalPost, {
    id: communityOnlyOriginal.id,
    unavailable: true,
  });

  const legalCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "tombstone-legal",
    visibility: CommunityVisibility.RESTRICTED,
  });
  const legalMembership = await createTestCommunityMember({
    cleanup,
    communityId: legalCommunity.id,
    userId: viewer.id,
  });
  const publicOriginal = await createTestPost({
    cleanup,
    runId,
    authorId: owner.id,
    communityId: legalCommunity.id,
    visibility: PostVisibility.PUBLIC,
  });
  const legalRepost = await PostService.repost(
    publicOriginal.id,
    actor(viewer),
    { content: "" },
  );
  trackPost(legalRepost.id);

  response = await PostService.getById(legalRepost.id, actor(viewer));
  assert.equal(response.originalPost?.id, publicOriginal.id);
  assert.ok(response.originalPost && !("unavailable" in response.originalPost));

  await prisma.community.update({
    where: { id: legalCommunity.id },
    data: { visibility: CommunityVisibility.PRIVATE },
  });
  await prisma.communityMember.delete({ where: { id: legalMembership.id } });
  response = await PostService.getById(legalRepost.id, actor(viewer));
  assert.deepEqual(response.originalPost, {
    id: publicOriginal.id,
    unavailable: true,
  });

  await createTestCommunityMember({
    cleanup,
    communityId: legalCommunity.id,
    userId: viewer.id,
  });
  await prisma.community.update({
    where: { id: legalCommunity.id },
    data: { visibility: CommunityVisibility.RESTRICTED, isSuspended: true },
  });
  response = await PostService.getById(legalRepost.id, actor(viewer));
  assert.deepEqual(response.originalPost, {
    id: publicOriginal.id,
    unavailable: true,
  });

  await prisma.community.update({
    where: { id: legalCommunity.id },
    data: { isSuspended: false },
  });
  await CommunityService.deleteCommunity(legalCommunity.id, actor(owner));
  response = await PostService.getById(legalRepost.id, actor(viewer));
  assert.deepEqual(response.originalPost, {
    id: publicOriginal.id,
    unavailable: true,
  });
});

test("Concurrent Community joins and stale promotions converge on one membership", async () => {
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "concurrent-owner",
  });
  const joining = await createTestUser({
    cleanup,
    runId,
    label: "concurrent-joining",
  });
  const promoting = await createTestUser({
    cleanup,
    runId,
    label: "concurrent-promoting",
  });
  const publicCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "concurrent-public",
  });

  const joined = await Promise.all([
    CommunityMemberService.joinCommunity(publicCommunity.id, actor(joining)),
    CommunityMemberService.joinCommunity(publicCommunity.id, actor(joining)),
  ]);
  const joinedRows = await prisma.communityMember.findMany({
    where: { communityId: publicCommunity.id, userId: joining.id },
  });
  assert.equal(joinedRows.length, 1);
  assert.ok(joined.every((result) => result.data.id === joinedRows[0].id));
  assert.ok(
    joined.every(
      (result) => result.data.status === CommunityMemberStatus.ACTIVE,
    ),
  );

  const restrictedCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "concurrent-restricted",
    visibility: CommunityVisibility.RESTRICTED,
  });
  const pending = await CommunityMemberService.joinCommunity(
    restrictedCommunity.id,
    actor(promoting),
  );
  await prisma.community.update({
    where: { id: restrictedCommunity.id },
    data: { visibility: CommunityVisibility.PUBLIC },
  });
  const promoted = await Promise.all([
    CommunityMemberService.joinCommunity(
      restrictedCommunity.id,
      actor(promoting),
    ),
    CommunityMemberService.joinCommunity(
      restrictedCommunity.id,
      actor(promoting),
    ),
  ]);
  const promotedRows = await prisma.communityMember.findMany({
    where: { communityId: restrictedCommunity.id, userId: promoting.id },
  });
  assert.equal(promotedRows.length, 1);
  assert.equal(promotedRows[0].id, pending.data.id);
  assert.equal(promotedRows[0].status, CommunityMemberStatus.ACTIVE);
  assert.ok(promoted.every((result) => result.data.id === pending.data.id));
});

test("Community and member pagination are bounded and deterministically ordered", async () => {
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "ordering-owner",
  });
  const baselineWhere = buildReadableCommunityWhere();
  const [baselineTotal, currentMaximum] = await Promise.all([
    prisma.community.count({ where: baselineWhere }),
    prisma.community.aggregate({
      where: baselineWhere,
      _max: { createdAt: true },
    }),
  ]);
  const baseTime = Math.max(
    Date.now(),
    currentMaximum._max.createdAt?.getTime() ?? 0,
  );
  const oldest = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "ordering-oldest",
    createdAt: new Date(baseTime + 1_000),
  });
  const middle = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "ordering-middle",
    createdAt: new Date(baseTime + 2_000),
  });
  const newest = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "ordering-newest",
    createdAt: new Date(baseTime + 3_000),
  });

  const firstPage = await CommunityService.getCommunities({
    page: 1,
    limit: 3,
  });
  assert.deepEqual(
    firstPage.data.map((community) => community.id),
    [newest.id, middle.id, oldest.id],
  );
  assert.equal(firstPage.meta.total, baselineTotal + 3);
  const maximumPage = await CommunityService.getCommunities({
    page: COMMUNITY_MAX_PAGE,
    limit: 1,
  });
  assert.equal(maximumPage.meta.page, COMMUNITY_MAX_PAGE);
  await assert.rejects(
    CommunityService.getCommunities({ page: COMMUNITY_MAX_PAGE + 1 }),
  );

  const memberCommunity = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "member-ordering",
  });
  const memberUsers = await Promise.all(
    ["oldest", "middle", "newest"].map((label) =>
      createTestUser({ cleanup, runId, label: `member-ordering-${label}` }),
    ),
  );
  const memberMaximum = await prisma.communityMember.aggregate({
    where: { communityId: memberCommunity.id },
    _max: { joinedAt: true },
  });
  const memberBase = memberMaximum._max.joinedAt?.getTime() ?? Date.now();
  await createTestCommunityMember({
    cleanup,
    communityId: memberCommunity.id,
    userId: memberUsers[0].id,
    joinedAt: new Date(memberBase + 1_000),
  });
  await createTestCommunityMember({
    cleanup,
    communityId: memberCommunity.id,
    userId: memberUsers[1].id,
    joinedAt: new Date(memberBase + 2_000),
  });
  await createTestCommunityMember({
    cleanup,
    communityId: memberCommunity.id,
    userId: memberUsers[2].id,
    joinedAt: new Date(memberBase + 3_000),
  });

  const [memberPageOne, memberPageTwo] = await Promise.all([
    CommunityMemberService.getCommunityMembers(memberCommunity.id, {
      page: 1,
      limit: 2,
    }),
    CommunityMemberService.getCommunityMembers(memberCommunity.id, {
      page: 2,
      limit: 2,
    }),
  ]);
  assert.deepEqual(
    memberPageOne.data.map((member) => member.user.id),
    [memberUsers[2].id, memberUsers[1].id],
  );
  assert.equal(memberPageTwo.data[0].user.id, memberUsers[0].id);
  assert.equal(memberPageOne.meta.total, 4);
  assert.equal(memberPageOne.meta.totalPages, 2);
});

test("Community management hierarchy protects ADMIN peers and pending requests", async () => {
  const owner = await createTestUser({
    cleanup,
    runId,
    label: "complete-hierarchy-owner",
  });
  const admin = await createTestUser({
    cleanup,
    runId,
    label: "complete-hierarchy-admin",
  });
  const adminPeer = await createTestUser({
    cleanup,
    runId,
    label: "complete-hierarchy-admin-peer",
  });
  const moderator = await createTestUser({
    cleanup,
    runId,
    label: "complete-hierarchy-moderator",
  });
  const pending = await createTestUser({
    cleanup,
    runId,
    label: "complete-hierarchy-pending",
  });
  const community = await createTestCommunityWithOwnerMembership({
    cleanup,
    runId,
    ownerId: owner.id,
    label: "complete-hierarchy-community",
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: admin.id,
    role: CommunityMemberRole.ADMIN,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: adminPeer.id,
    role: CommunityMemberRole.ADMIN,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: moderator.id,
    role: CommunityMemberRole.MODERATOR,
  });
  await createTestCommunityMember({
    cleanup,
    communityId: community.id,
    userId: pending.id,
    status: CommunityMemberStatus.PENDING,
  });

  await assert.rejects(
    CommunityMemberService.updateMemberStatus(
      community.id,
      adminPeer.id,
      actor(admin),
      { status: CommunityMemberStatus.BANNED },
    ),
  );
  await assert.rejects(
    CommunityMemberService.updateMemberRole(
      community.id,
      moderator.id,
      actor(admin),
      { role: CommunityMemberRole.ADMIN },
    ),
  );
  await assert.rejects(
    CommunityMemberService.removeCommunityMember(
      community.id,
      pending.id,
      actor(moderator),
    ),
  );
  await CommunityMemberService.updateMemberStatus(
    community.id,
    moderator.id,
    actor(admin),
    { status: CommunityMemberStatus.BANNED },
  );
  await CommunityMemberService.updateMemberStatus(
    community.id,
    moderator.id,
    actor(admin),
    { status: CommunityMemberStatus.ACTIVE },
  );
  await CommunityMemberService.updateMemberRole(
    community.id,
    moderator.id,
    actor(owner),
    { role: CommunityMemberRole.ADMIN },
  );
});
