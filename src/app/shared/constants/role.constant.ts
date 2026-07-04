export const USER_ROLE = {
  USER: "USER",
  MODERATOR: "MODERATOR",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type TUserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
