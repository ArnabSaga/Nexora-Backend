import type { Prisma } from "../../../generated/prisma/client";
import {
  createProfileMediaCasWriter,
  type TProfileMediaCasRow,
} from "./profile-media-cas.factory";

type TProfileMediaPrismaClient = Pick<Prisma.TransactionClient, "profile">;

const PROFILE_MEDIA_CAS_SELECT = {
  userId: true,
  avatar: true,
  coverPhoto: true,
  updatedAt: true,
} as const;

export const createPrismaProfileMediaCasWriter = (
  client: TProfileMediaPrismaClient,
) =>
  createProfileMediaCasWriter({
    read: (userId) =>
      client.profile.findUnique({
        where: { userId },
        select: PROFILE_MEDIA_CAS_SELECT,
      }) as Promise<TProfileMediaCasRow | null>,
    compareAndSwap: ({ userId, field, expectedUrl, uploadedUrl }) => {
      if (field === "avatar") {
        return client.profile.updateManyAndReturn({
          where: { userId, avatar: expectedUrl },
          data: { avatar: uploadedUrl },
          select: PROFILE_MEDIA_CAS_SELECT,
        });
      }

      return client.profile.updateManyAndReturn({
        where: { userId, coverPhoto: expectedUrl },
        data: { coverPhoto: uploadedUrl },
        select: PROFILE_MEDIA_CAS_SELECT,
      });
    },
  });
