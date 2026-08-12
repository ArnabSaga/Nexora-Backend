import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";
import {
  createPrismaBookmarkReadService,
  type TBookmarkReadPrismaClient,
} from "../../bookmark/bookmark-read.prisma.factory";
import {
  createPrismaVoteReadService,
  type TVoteReadPrismaClient,
} from "../../vote/vote-read.prisma.factory";
import { PostSelect } from "../constants/post.select";
import { createPostResponseService } from "./post-response.factory";
import { PostVisibilityService } from "./post-visibility.service";

type TPostResponsePrismaClient = Pick<Prisma.TransactionClient, "post"> &
  TVoteReadPrismaClient &
  TBookmarkReadPrismaClient;

export const createPrismaPostResponseService = (
  client: TPostResponsePrismaClient,
) => {
  const voteReadService = createPrismaVoteReadService(client);
  const bookmarkReadService = createPrismaBookmarkReadService(client);

  return createPostResponseService({
    findVisibleOriginalPosts: (originalIds, viewer) =>
      client.post.findMany({
        where: {
          AND: [
            {
              id: {
                in: originalIds,
              },
            },
            PostVisibilityService.buildVisiblePostWhere(viewer),
          ],
        },
        select: PostSelect.ORIGINAL_POST,
      }),
    getPostVoteStates: voteReadService.getPostVoteStates,
    getPostBookmarkStates: bookmarkReadService.getPostBookmarkStates,
  });
};

export const PostResponseService = createPrismaPostResponseService(prisma);
