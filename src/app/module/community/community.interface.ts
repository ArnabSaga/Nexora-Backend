import type {
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityVisibility,
} from "../../../generated/prisma/client";
import type { TMeta } from "../../shared/response/response.types";
import type { TPublicUser } from "../user/user.interface";

export type TCommunityListQuery = {
  page?: number;
  limit?: number;
};

export type TCommunityMemberListQuery = TCommunityListQuery & {
  status?: CommunityMemberStatus;
};

export type TCreateCommunityPayload = {
  name: string;
  description?: string | null;
  visibility?: CommunityVisibility;
};

export type TUpdateCommunityPayload = Partial<TCreateCommunityPayload>;

export type TUpdateCommunityRolePayload = {
  role: CommunityMemberRole;
};

export type TUpdateCommunityStatusPayload = {
  status: CommunityMemberStatus;
};

export type TCommunityResponse = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar: string | null;
  coverPhoto: string | null;
  visibility: CommunityVisibility;
  owner: TPublicUser;
  membersCount: number;
  viewerState: {
    role: CommunityMemberRole | null;
    status: CommunityMemberStatus | null;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type TCommunityMemberResponse = {
  id: string;
  user: TPublicUser;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
  joinedAt: Date;
};

export type TCommunityListResult = {
  data: TCommunityResponse[];
  meta: TMeta;
};

export type TCommunityMemberListResult = {
  data: TCommunityMemberResponse[];
  meta: TMeta;
};

export type TCommunityMembershipActionResult = {
  statusCode: number;
  message: string;
  data: {
    id: string;
    role: CommunityMemberRole;
    status: CommunityMemberStatus;
  };
};
