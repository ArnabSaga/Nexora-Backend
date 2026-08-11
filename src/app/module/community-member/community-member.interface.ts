import type {
  CommunityMemberRole,
  CommunityMemberStatus,
} from "../../../generated/prisma/client";
import type { TCommunityPaginationQuery } from "../community/community.pagination";
import type { TMeta } from "../../shared/response/response.types";
import type { TPublicUser } from "../user/user.interface";

export type TCommunityMemberListQuery = TCommunityPaginationQuery & {
  status?: CommunityMemberStatus;
};

export type TUpdateCommunityRolePayload = {
  role: CommunityMemberRole;
};

export type TUpdateCommunityStatusPayload = {
  status: CommunityMemberStatus;
};

export type TCommunityMemberResponse = {
  id: string;
  user: TPublicUser;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
  joinedAt: Date;
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
