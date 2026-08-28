import type { Prisma } from "../../../generated/prisma/client";
import { isUniqueConstraintOn } from "../helpers/prismaUnique";
import { createHashtagWriter } from "./hashtag-write.factory";

export type THashtagWritePrismaClient = Pick<
  Prisma.TransactionClient,
  "hashtag" | "postHashtag"
>;

export const createPrismaHashtagWriter = (client: THashtagWritePrismaClient) =>
  createHashtagWriter({
    getOrCreateHashtag: async (name) => {
      try {
        return await client.hashtag.upsert({
          where: { name },
          update: {},
          create: { name },
          select: { id: true },
        });
      } catch (error) {
        if (isUniqueConstraintOn(error, ["name"])) {
          return client.hashtag.findUniqueOrThrow({
            where: { name },
            select: { id: true },
          });
        }
        throw error;
      }
    },
    findPostHashtags: (postId) =>
      client.postHashtag.findMany({
        where: { postId },
        select: { hashtagId: true },
      }),
    createPostHashtags: (postId, hashtagIds) =>
      client.postHashtag.createManyAndReturn({
        data: hashtagIds.map((hashtagId) => ({ postId, hashtagId })),
        skipDuplicates: true,
        select: { hashtagId: true },
      }),
    deletePostHashtag: async (postId, hashtagId) => {
      const result = await client.postHashtag.deleteMany({
        where: { postId, hashtagId },
      });
      return result.count;
    },
    incrementHashtag: async (id) => {
      await client.hashtag.update({
        where: { id },
        data: { postCount: { increment: 1 } },
      });
    },
    decrementHashtag: async (id) => {
      await client.hashtag.updateMany({
        where: { id, postCount: { gt: 0 } },
        data: { postCount: { decrement: 1 } },
      });
    },
  });
