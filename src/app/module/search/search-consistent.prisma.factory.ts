import { Prisma } from "../../../generated/prisma/client";
import type { TSearchReader } from "./search.interface";
import {
  createPrismaSearchReader,
  type TSearchPrismaClient,
} from "./search.prisma.factory";

type TSearchRootPrismaClient = {
  $transaction<T>(
    operation: (client: Prisma.TransactionClient) => Promise<T>,
    options: { isolationLevel: Prisma.TransactionIsolationLevel },
  ): Promise<T>;
};

export type TPrismaSearchReaderFactory = (
  client: TSearchPrismaClient,
) => TSearchReader;

export const createConsistentPrismaSearchReader = (
  rootClient: TSearchRootPrismaClient,
  readerFactory: TPrismaSearchReaderFactory = createPrismaSearchReader,
): TSearchReader => {
  const run = <T>(
    operation: (reader: TSearchReader) => Promise<T>,
  ): Promise<T> =>
    rootClient.$transaction(
      (client) => operation(readerFactory(client)),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

  return {
    searchUsers: (query, viewer) =>
      run((reader) => reader.searchUsers(query, viewer)),
    searchPosts: (query, viewer) =>
      run((reader) => reader.searchPosts(query, viewer)),
    searchCommunities: (query, viewer) =>
      run((reader) => reader.searchCommunities(query, viewer)),
    searchHashtags: (query, viewer) =>
      run((reader) => reader.searchHashtags(query, viewer)),
  };
};
