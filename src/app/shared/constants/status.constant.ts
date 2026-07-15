export const USER_STATUS = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  DELETED: "DELETED",
} as const;

export type TUserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
