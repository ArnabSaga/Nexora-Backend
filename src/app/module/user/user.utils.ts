import { UserRole, UserStatus } from "../../../generated/prisma/client";
import AppError from "../../shared/errors/AppError";
import status from "http-status";
import { TAdminUser, TPublicUser } from "./user.interface";

export type TUserCountPayload = {
  followers?: number;
  following?: number;
};

export type TUserProfilePayload = {
  id: string;
  username: string;
  avatar?: string | null;
  headline?: string | null;
} | null;

export type TPublicUserPayload = {
  id: string;
  name: string;
  image?: string | null;
  createdAt: Date;
  profile?: TUserProfilePayload;
  _count?: TUserCountPayload;
};

export type TAdminUserPayload = TPublicUserPayload & {
  email: string;
  emailVerified: boolean;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: Date | null;
  deletedAt?: Date | null;
  updatedAt: Date;
};

export const mapPublicUser = (
  user: TPublicUserPayload,
  options: {
    postsCount?: number;
  } = {},
): TPublicUser => {
  const profile = user.profile ?? null;

  return {
    id: user.id,
    name: user.name,
    avatar: profile?.avatar ?? user.image ?? null,
    createdAt: user.createdAt,
    profile: profile
      ? {
          id: profile.id,
          username: profile.username,
          headline: profile.headline ?? null,
        }
      : null,
    followersCount: user._count?.followers ?? 0,
    followingCount: user._count?.following ?? 0,
    ...(options.postsCount !== undefined && { postsCount: options.postsCount }),
  };
};

export const mapAdminUser = (
  user: TAdminUserPayload,
  options: {
    postsCount?: number;
  } = {},
): TAdminUser => {
  return {
    ...mapPublicUser(user, options),
    email: user.email,
    emailVerified: user.emailVerified,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt ?? null,
    deletedAt: user.deletedAt ?? null,
    updatedAt: user.updatedAt,
  };
};

export const ensureCanManageTargetRole = ({
  actorId,
  actorRole,
  targetId,
  targetRole,
  nextRole,
}: {
  actorId: string;
  actorRole: UserRole;
  targetId: string;
  targetRole: UserRole;
  nextRole?: UserRole;
}) => {
  if (actorId === targetId) {
    throw new AppError(status.FORBIDDEN, "You cannot change your own role");
  }

  if (actorRole === UserRole.SUPER_ADMIN) {
    return;
  }

  if (targetRole === UserRole.ADMIN || targetRole === UserRole.SUPER_ADMIN) {
    throw new AppError(status.FORBIDDEN, "You cannot modify this user role");
  }

  if (nextRole === undefined) {
    return;
  }

  const allowedAdminTransition =
    (targetRole === UserRole.USER && nextRole === UserRole.MODERATOR) ||
    (targetRole === UserRole.MODERATOR && nextRole === UserRole.USER) ||
    targetRole === nextRole;

  if (!allowedAdminTransition) {
    throw new AppError(status.FORBIDDEN, "This role transition is not allowed");
  }
};

export const ensureCanManageTargetStatus = ({
  actorId,
  actorRole,
  targetId,
  targetRole,
}: {
  actorId: string;
  actorRole: UserRole;
  targetId: string;
  targetRole: UserRole;
}) => {
  if (actorId === targetId) {
    throw new AppError(status.FORBIDDEN, "You cannot change your own status");
  }

  if (actorRole === UserRole.SUPER_ADMIN) {
    return;
  }

  if (targetRole === UserRole.ADMIN || targetRole === UserRole.SUPER_ADMIN) {
    throw new AppError(status.FORBIDDEN, "You cannot modify this user status");
  }
};

export const ensureCanDeleteTarget = ({
  actorId,
  actorRole,
  targetId,
  targetRole,
}: {
  actorId: string;
  actorRole: UserRole;
  targetId: string;
  targetRole: UserRole;
}) => {
  if (actorId === targetId) {
    throw new AppError(
      status.FORBIDDEN,
      "You cannot delete your own account from this endpoint",
    );
  }

  if (actorRole === UserRole.SUPER_ADMIN) {
    return;
  }

  if (targetRole === UserRole.ADMIN || targetRole === UserRole.SUPER_ADMIN) {
    throw new AppError(status.FORBIDDEN, "You cannot delete this user");
  }
};

export const isDeletedUser = (user: {
  status: UserStatus;
  deletedAt?: Date | null;
}) => {
  return user.status === UserStatus.DELETED || Boolean(user.deletedAt);
};
