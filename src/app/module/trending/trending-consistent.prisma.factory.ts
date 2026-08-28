import { Prisma } from "../../../generated/prisma/client";
import type { TTrendingReader } from "./trending.interface";
import {
  createPrismaTrendingReader,
  type TTrendingPrismaClient,
} from "./trending.prisma.factory";

type TTrendingRootPrismaClient = {
  $transaction<T>(
    operation: (client: Prisma.TransactionClient) => Promise<T>,
    options: { isolationLevel: Prisma.TransactionIsolationLevel },
  ): Promise<T>;
};

export type TPrismaTrendingReaderFactory = (
  client: TTrendingPrismaClient,
) => TTrendingReader;

export const createConsistentPrismaTrendingReader = (
  rootClient: TTrendingRootPrismaClient,
  readerFactory: TPrismaTrendingReaderFactory = createPrismaTrendingReader,
): TTrendingReader => {
  const run = <T>(operation: (reader: TTrendingReader) => Promise<T>) =>
    rootClient.$transaction((client) => operation(readerFactory(client)), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });

  return {
    getTrendingPosts: (query, viewer) =>
      run((reader) => reader.getTrendingPosts(query, viewer)),
    getTrendingHashtags: (query) =>
      run((reader) => reader.getTrendingHashtags(query)),
  };
};
