import { UserStatus } from "../../../generated/prisma/client";
import type { Prisma } from "../../../generated/prisma/client";

export const ACTIVE_PUBLIC_USER_WHERE = {
  status: UserStatus.ACTIVE,
  deletedAt: null,
} satisfies Prisma.UserWhereInput;

export const PUBLIC_USER_COUNT_SELECT = {
  followers: {
    where: {
      follower: {
        is: ACTIVE_PUBLIC_USER_WHERE,
      },
    },
  },
  following: {
    where: {
      following: {
        is: ACTIVE_PUBLIC_USER_WHERE,
      },
    },
  },
} satisfies Prisma.UserCountOutputTypeSelect;
