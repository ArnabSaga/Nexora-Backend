import assert from "node:assert/strict";
import test from "node:test";
import {
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityVisibility,
} from "../../../../src/generated/prisma/client";
import { createCommunityResponseService } from "../../../../src/app/module/community/community-response.factory";
import type { TCommunityPayload } from "../../../../src/app/module/community/community.select";

const date = new Date("2026-01-01T00:00:00.000Z");
const community = {
  id: "community-1",
  ownerId: "owner-1",
  name: "Community",
  slug: "community",
  description: null,
  avatar: null,
  coverPhoto: null,
  visibility: CommunityVisibility.PUBLIC,
  createdAt: date,
  updatedAt: date,
  owner: {
    id: "owner-1",
    name: "Owner",
    image: null,
    createdAt: date,
    profile: null,
    _count: { followers: 2, following: 3 },
  },
  _count: { members: 4 },
} satisfies TCommunityPayload;

test("Community response extraction preserves canonical DTO and viewer membership", async () => {
  const service = createCommunityResponseService({
    findViewerMemberships: async () => [
      {
        communityId: community.id,
        role: CommunityMemberRole.MODERATOR,
        status: CommunityMemberStatus.ACTIVE,
      },
    ],
  });
  const viewer = { id: "viewer-1" } as Express.AuthenticatedUser;
  const result = await service.enrichCommunity(community, viewer);

  assert.equal(result.id, community.id);
  assert.equal(result.owner.id, community.owner.id);
  assert.equal(result.membersCount, 4);
  assert.deepEqual(result.viewerState, {
    role: CommunityMemberRole.MODERATOR,
    status: CommunityMemberStatus.ACTIVE,
  });
  assert.equal(result.description, null);
  assert.equal(result.avatar, null);
});
