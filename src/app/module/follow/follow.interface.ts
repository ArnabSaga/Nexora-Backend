import type { TMeta } from "../../shared/response/response.types";
import type { TPublicUser } from "../user/user.interface";

export type TFollowListQuery = {
  page?: number;
  limit?: number;
};

export type TFollowActionResult = {
  statusCode: number;
  message: string;
  data: {
    following: boolean;
  };
};

export type TFollowListResult = {
  data: TPublicUser[];
  meta: TMeta;
};
