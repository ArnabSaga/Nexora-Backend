import {
  CommunityMemberStatus,
  CommunityVisibility,
  PostVisibility,
  Prisma,
  UserStatus,
} from "../../../../generated/prisma/client";

type TViewer = Express.AuthenticatedUser | undefined;

const activeAuthorWhere = {
  status: UserStatus.ACTIVE,
  deletedAt: null,
} satisfies Prisma.UserWhereInput;

const activeMemberAccessWhere = (viewerId: string): Prisma.CommunityWhereInput => ({
  isSuspended: false,
  OR: [
    {
      ownerId: viewerId,
    },
    {
      members: {
        some: {
          userId: viewerId,
          status: CommunityMemberStatus.ACTIVE,
        },
      },
    },
  ],
});

const publicCommunityWhere = {
  visibility: CommunityVisibility.PUBLIC,
  isSuspended: false,
} satisfies Prisma.CommunityWhereInput;

const buildCommunityBoundaryWhere = (
  viewer?: TViewer,
): Prisma.PostWhereInput => {
  if (!viewer) {
    return {
      OR: [
        {
          communityId: null,
        },
        {
          community: {
            is: publicCommunityWhere,
          },
        },
      ],
    };
  }

  return {
    OR: [
      {
        communityId: null,
      },
      {
        community: {
          is: publicCommunityWhere,
        },
      },
      {
        community: {
          is: activeMemberAccessWhere(viewer.id),
        },
      },
    ],
  };
};

const buildPostVisibilityWhere = (viewer?: TViewer): Prisma.PostWhereInput => {
  if (!viewer) {
    return {
      visibility: PostVisibility.PUBLIC,
    };
  }

  return {
    OR: [
      {
        visibility: PostVisibility.PUBLIC,
      },
      {
        authorId: viewer.id,
      },
      {
        visibility: PostVisibility.FOLLOWERS,
        author: {
          followers: {
            some: {
              followerId: viewer.id,
            },
          },
        },
      },
      {
        visibility: PostVisibility.COMMUNITY_ONLY,
        community: {
          is: activeMemberAccessWhere(viewer.id),
        },
      },
    ],
  };
};

const buildVisiblePostWhere = (viewer?: TViewer): Prisma.PostWhereInput => {
  return {
    isDeleted: false,
    author: {
      is: activeAuthorWhere,
    },
    AND: [buildCommunityBoundaryWhere(viewer), buildPostVisibilityWhere(viewer)],
  };
};

const buildPublicOnlyWhere = (): Prisma.PostWhereInput => {
  return buildVisiblePostWhere(undefined);
};

export const PostVisibilityService = {
  buildVisiblePostWhere,
  buildPublicOnlyWhere,
};
