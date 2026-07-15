import { UserRole, UserStatus } from '../../../generated/prisma/client';

export type TAuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  profile?: {
    id: string;
    username: string;
    avatar?: string | null;
    headline?: string | null;
  } | null;
};

export type TRegisterPayload = {
  name: string;
  email: string;
  password: string;
  image?: string;
  rememberMe?: boolean;
};

export type TLoginPayload = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type TVerifyEmailPayload = {
  token: string;
  callbackURL?: string;
};

export type TForgotPasswordPayload = {
  email: string;
  redirectTo?: string;
};

export type TResendVerificationEmailPayload = {
  email: string;
  callbackURL?: string;
};

export type TGoogleLoginPayload = {
  callbackURL?: string;
  newUserCallbackURL?: string;
  errorCallbackURL?: string;
};

export type TResetPasswordPayload = {
  token: string;
  newPassword: string;
};

export type TChangePasswordPayload = {
  oldPassword?: string;
  currentPassword?: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
};
