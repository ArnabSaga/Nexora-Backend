import {
  PostVisibility,
  Prisma,
  UserStatus,
} from "../../../../generated/prisma/client";
import {
  buildAvailableParticipationWhere,
  buildReadableCommunityWhere,
} from "../../../shared/policies/community.policy";

type TViewer = Express.AuthenticatedUser | undefined;

const activeAuthorWhere = {
  status: UserStatus.ACTIVE,
  deletedAt: null,
} satisfies Prisma.UserWhereInput;

const buildCommunityBoundaryWhere = (
  viewer?: TViewer,
): Prisma.PostWhereInput => {
  return {
    OR: [
      {
        communityId: null,
      },
      {
        community: {
          is: buildReadableCommunityWhere(viewer),
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
        visibility: PostVisibility.PRIVATE,
        authorId: viewer.id,
      },
      {
        visibility: PostVisibility.FOLLOWERS,
        OR: [
          {
            authorId: viewer.id,
          },
          {
            author: {
              followers: {
                some: {
                  followerId: viewer.id,
                },
              },
            },
          },
        ],
      },
      {
        visibility: PostVisibility.COMMUNITY_ONLY,
        community: {
          is: buildAvailableParticipationWhere(viewer.id),
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
    AND: [
      buildCommunityBoundaryWhere(viewer),
      buildPostVisibilityWhere(viewer),
    ],
  };
};

const buildPublicOnlyWhere = (): Prisma.PostWhereInput => {
  return buildVisiblePostWhere(undefined);
};

export const PostVisibilityService = {
  buildVisiblePostWhere,
  buildPublicOnlyWhere,
};
