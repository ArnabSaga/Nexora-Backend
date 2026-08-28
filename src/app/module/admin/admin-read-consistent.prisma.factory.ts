import { Prisma } from "../../../generated/prisma/client";
import type { TAdminReader } from "./admin.interface";
import {
  createPrismaAdminReader,
  type TAdminPrismaClient,
} from "./admin-read.prisma.factory";

type TAdminRootPrismaClient = {
  $transaction<T>(
    operation: (client: Prisma.TransactionClient) => Promise<T>,
    options: { isolationLevel: Prisma.TransactionIsolationLevel },
  ): Promise<T>;
};

export type TPrismaAdminReaderFactory = (
  client: TAdminPrismaClient,
) => TAdminReader;

export const createConsistentPrismaAdminReader = (
  rootClient: TAdminRootPrismaClient,
  readerFactory: TPrismaAdminReaderFactory = createPrismaAdminReader,
): TAdminReader => {
  const run = <T>(operation: (reader: TAdminReader) => Promise<T>) =>
    rootClient.$transaction((client) => operation(readerFactory(client)), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });

  return {
    getDashboard: () => run((reader) => reader.getDashboard()),
    getPosts: (query) => run((reader) => reader.getPosts(query)),
    getCommunities: (query) => run((reader) => reader.getCommunities(query)),
  };
};
