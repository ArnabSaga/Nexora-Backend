import type {
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityVisibility,
} from "../../../generated/prisma/client";
import type { TMeta } from "../../shared/response/response.types";
import type { TPublicUser } from "../user/user.interface";
import type { TCommunityPaginationQuery } from "./community.pagination";

export type TCommunityListQuery = TCommunityPaginationQuery;

export type TCreateCommunityPayload = {
  name: string;
  description?: string | null;
  visibility?: CommunityVisibility;
};

export type TUpdateCommunityPayload = Partial<TCreateCommunityPayload>;

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

export type TCommunityListResult = {
  data: TCommunityResponse[];
  meta: TMeta;
};
