import type { Prisma } from "../../../generated/prisma/client";

export type TInsertedMention = {
  id: string;
  mentionedUserId: string;
};

export type TMentionResponse = {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
};

export type TMentionWriter = {
  validateUsers(ids: string[]): Promise<void>;
  syncPost(postId: string, ids: string[]): Promise<TInsertedMention[]>;
  syncComment(commentId: string, ids: string[]): Promise<TInsertedMention[]>;
};

export type TMentionPrismaClient = Pick<
  Prisma.TransactionClient,
  "user" | "postMention" | "commentMention"
>;

export type TMentionWriterFactory = (
  client: TMentionPrismaClient,
) => TMentionWriter;
