import { UserRole, UserStatus } from "../../../generated/prisma/client";

export type TUserListQuery = {
  searchTerm?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type TUpdateUserRolePayload = {
  role: UserRole;
};

export type TUpdateUserStatusPayload = {
  status: Extract<UserStatus, "ACTIVE" | "SUSPENDED">;
};

export type TUserProfileSummary = {
  id: string;
  username: string;
  headline?: string | null;
} | null;

export type TPublicUser = {
  id: string;
  name: string;
  avatar?: string | null;
  createdAt: Date;
  profile: TUserProfileSummary;
  followersCount: number;
  followingCount: number;
  postsCount?: number;
};

export type TAdminUser = TPublicUser & {
  email: string;
  emailVerified: boolean;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: Date | null;
  deletedAt?: Date | null;
  updatedAt: Date;
};
