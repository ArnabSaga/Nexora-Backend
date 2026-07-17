import { PostVisibility, Prisma } from "../../../generated/prisma/client";

export const PUBLIC_PROFILE_POST_WHERE = {
  visibility: PostVisibility.PUBLIC,
  isDeleted: false,
  communityId: null,
} as const satisfies Prisma.PostWhereInput;
