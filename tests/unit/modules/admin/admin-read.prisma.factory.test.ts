import assert from "node:assert/strict";
import test from "node:test";
import {
  CommunityVisibility,
  PostType,
  PostVisibility,
  ReportStatus,
  UserRole,
  UserStatus,
} from "../../../../src/generated/prisma/client";
import {
  buildAdminCommunityWhere,
  buildAdminPostWhere,
  createPrismaAdminReader,
} from "../../../../src/app/module/admin/admin-read.prisma.factory";

const date = new Date("2026-08-16T00:00:00.000Z");

test("Admin inventory builders lock lifecycle and literal contains predicates", () => {
  assert.deepEqual(
    buildAdminPostWhere({
      page: 1,
      limit: 20,
      state: "DELETED",
      patternSearchTerm: "100\\%",
    }),
    {
      isDeleted: true,
      content: { contains: "100\\%", mode: "insensitive" },
    },
  );
  assert.deepEqual(
    buildAdminCommunityWhere({
      page: 1,
      limit: 20,
      state: "SUSPENDED",
      patternSearchTerm: "foo\\_",
    }),
    {
      deletedAt: null,
      isSuspended: true,
      OR: [
        { name: { contains: "foo\\_", mode: "insensitive" } },
        { slug: { contains: "foo\\_", mode: "insensitive" } },
        { description: { contains: "foo\\_", mode: "insensitive" } },
      ],
    },
  );
  assert.deepEqual(buildAdminPostWhere({ page: 1, limit: 20 }), {});
  assert.deepEqual(buildAdminCommunityWhere({ page: 1, limit: 20 }), {});
});

test("Admin dashboard partitions rows and aggregates all Report tables", async () => {
  const statusCounts = {
    [ReportStatus.PENDING]: 1,
    [ReportStatus.REVIEWED]: 2,
    [ReportStatus.RESOLVED]: 3,
    [ReportStatus.REJECTED]: 4,
  };
  const reportDelegate = {
    count: async ({ where }: { where: { status: ReportStatus } }) =>
      statusCounts[where.status],
  };
  const queues = {
    user: [5, 2, 1],
    post: [8, 3],
    community: [4, 2, 1],
  };
  const client = {
    user: { count: async () => queues.user.shift()! },
    post: { count: async () => queues.post.shift()! },
    community: { count: async () => queues.community.shift()! },
    userReport: reportDelegate,
    postReport: reportDelegate,
    commentReport: reportDelegate,
    communityReport: reportDelegate,
  };
  const result = await createPrismaAdminReader(client as never).getDashboard();

  assert.deepEqual(result.users, {
    total: 8,
    active: 5,
    suspended: 2,
    deleted: 1,
  });
  assert.deepEqual(result.posts, { total: 11, active: 8, deleted: 3 });
  assert.deepEqual(result.communities, {
    total: 7,
    active: 4,
    suspended: 2,
    deleted: 1,
  });
  assert.deepEqual(result.reports, {
    total: 40,
    pending: 4,
    reviewed: 8,
    resolved: 12,
    rejected: 16,
  });
});

test("Admin Post inventory shares one where and maps unavailable raw counts", async () => {
  let countWhere: unknown;
  let fetchWhere: unknown;
  let fetchOrderBy: unknown;
  let fetchSkip: unknown;
  let fetchTake: unknown;
  const post = {
    id: "post-id",
    authorId: "author-id",
    communityId: null,
    parentPostId: null,
    repostId: null,
    content: "moderation",
    postType: PostType.SHORT,
    visibility: PostVisibility.PRIVATE,
    isEdited: false,
    isDeleted: true,
    createdAt: date,
    updatedAt: date,
    author: {
      id: "author-id",
      name: "Unavailable",
      role: UserRole.USER,
      status: UserStatus.DELETED,
      deletedAt: date,
      profile: null,
    },
    community: null,
    media: [],
    hashtags: [],
    _count: { comments: 4, reactions: 3, votes: 2, bookmarks: 1, reports: 5 },
  };
  const client = {
    post: {
      count: async ({ where }: { where: unknown }) => {
        countWhere = where;
        return 1;
      },
      findMany: async ({
        where,
        orderBy,
        skip,
        take,
      }: {
        where: unknown;
        orderBy: unknown;
        skip: unknown;
        take: unknown;
      }) => {
        fetchWhere = where;
        fetchOrderBy = orderBy;
        fetchSkip = skip;
        fetchTake = take;
        return [post];
      },
    },
  };
  const result = await createPrismaAdminReader(client as never).getPosts({
    page: 1,
    limit: 20,
    state: "DELETED",
  });

  assert.equal(countWhere, fetchWhere);
  assert.deepEqual(fetchOrderBy, [{ createdAt: "desc" }, { id: "desc" }]);
  assert.equal(fetchSkip, 0);
  assert.equal(fetchTake, 20);
  assert.equal(result.data[0]?.author.username, "author-id");
  assert.equal(result.data[0]?.community, null);
  assert.deepEqual(result.data[0]?.counts, {
    comments: 4,
    reactions: 3,
    votes: 2,
    bookmarks: 1,
    reports: 5,
  });
});

test("Admin Community inventory shares one where and preserves stored counts", async () => {
  let countWhere: unknown;
  let fetchWhere: unknown;
  let fetchOrderBy: unknown;
  let fetchSkip: unknown;
  let fetchTake: unknown;
  const community = {
    id: "community-id",
    ownerId: "owner-id",
    name: "Deleted Community",
    slug: "deleted-community",
    description: null,
    avatar: null,
    coverPhoto: null,
    visibility: CommunityVisibility.PRIVATE,
    isSuspended: true,
    deletedAt: date,
    createdAt: date,
    updatedAt: date,
    owner: {
      id: "owner-id",
      name: "Owner",
      role: UserRole.ADMIN,
      status: UserStatus.SUSPENDED,
      deletedAt: null,
      profile: { username: "owner", avatar: null },
    },
    _count: { members: 7, posts: 6, reports: 5 },
  };
  const client = {
    community: {
      count: async ({ where }: { where: unknown }) => {
        countWhere = where;
        return 1;
      },
      findMany: async ({
        where,
        orderBy,
        skip,
        take,
      }: {
        where: unknown;
        orderBy: unknown;
        skip: unknown;
        take: unknown;
      }) => {
        fetchWhere = where;
        fetchOrderBy = orderBy;
        fetchSkip = skip;
        fetchTake = take;
        return [community];
      },
    },
  };
  const result = await createPrismaAdminReader(client as never).getCommunities({
    page: 1,
    limit: 20,
    state: "DELETED",
  });

  assert.equal(countWhere, fetchWhere);
  assert.deepEqual(fetchOrderBy, [{ createdAt: "desc" }, { id: "desc" }]);
  assert.equal(fetchSkip, 0);
  assert.equal(fetchTake, 20);
  assert.deepEqual(result.data[0]?.counts, {
    members: 7,
    posts: 6,
    reports: 5,
  });
  assert.equal(result.data[0]?.owner.status, UserStatus.SUSPENDED);
});
