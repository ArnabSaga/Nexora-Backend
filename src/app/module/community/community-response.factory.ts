import type {
  CommunityMemberRole,
  CommunityMemberStatus,
} from "../../../generated/prisma/client";
import { mapPublicUser } from "../user/user.utils";
import type { TCommunityResponse } from "./community.interface";
import type { TCommunityPayload } from "./community.select";

export type TCommunityViewerMembership = {
  communityId: string;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
};

type TCommunityResponseCollaborators = {
  findViewerMemberships: (
    communityIds: string[],
    viewer?: Express.AuthenticatedUser,
  ) => Promise<TCommunityViewerMembership[]>;
};

export const mapCommunityResponse = (
  community: TCommunityPayload,
  membership?: TCommunityViewerMembership,
): TCommunityResponse => ({
  id: community.id,
  name: community.name,
  slug: community.slug,
  description: community.description ?? null,
  avatar: community.avatar ?? null,
  coverPhoto: community.coverPhoto ?? null,
  visibility: community.visibility,
  owner: mapPublicUser(community.owner),
  membersCount: community._count.members,
  viewerState: {
    role: membership?.role ?? null,
    status: membership?.status ?? null,
  },
  createdAt: community.createdAt,
  updatedAt: community.updatedAt,
});

export const createCommunityResponseService = ({
  findViewerMemberships,
}: TCommunityResponseCollaborators) => {
  const enrichCommunities = async (
    communities: TCommunityPayload[],
    viewer?: Express.AuthenticatedUser,
  ): Promise<TCommunityResponse[]> => {
    if (!communities.length) return [];

    const memberships = await findViewerMemberships(
      communities.map((community) => community.id),
      viewer,
    );
    const membershipByCommunityId = new Map(
      memberships.map((membership) => [membership.communityId, membership]),
    );

    return communities.map((community) =>
      mapCommunityResponse(
        community,
        membershipByCommunityId.get(community.id),
      ),
    );
  };

  const enrichCommunity = async (
    community: TCommunityPayload,
    viewer?: Express.AuthenticatedUser,
  ): Promise<TCommunityResponse> => {
    const [result] = await enrichCommunities([community], viewer);
    if (!result)
      throw new Error("Community response enrichment produced no result");
    return result;
  };

  return { enrichCommunity, enrichCommunities };
};

export type TCommunityResponseService = ReturnType<
  typeof createCommunityResponseService
>;
