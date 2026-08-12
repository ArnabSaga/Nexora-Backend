import type { Prisma } from "../../../generated/prisma/client";
import { createBookmarkReadService } from "./bookmark-read.factory";

export type TBookmarkReadPrismaClient = Pick<
  Prisma.TransactionClient,
  "bookmark"
>;

export const createPrismaBookmarkReadService = (
  client: TBookmarkReadPrismaClient,
) => {
  const getViewerBookmarks = (postIds: string[], viewerId: string) =>
    client.bookmark.findMany({
      where: {
        userId: viewerId,
        postId: { in: postIds },
      },
      select: { postId: true },
    });

  return createBookmarkReadService({ getViewerBookmarks });
};
