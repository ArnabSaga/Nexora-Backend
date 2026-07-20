import { Prisma } from "../../../../generated/prisma/client";
import { isUniqueConstraintOn } from "../../../shared/helpers/prismaUnique";
import { HASHTAG_MAX_LENGTH } from "../constants/post.constant";

const HASHTAG_PATTERN = /(^|\s)#([a-zA-Z0-9_]+)/g;

const normalizeTag = (tag: string) =>
  tag.replace(/^#/, "").trim().toLowerCase().slice(0, HASHTAG_MAX_LENGTH);

const extractHashtagNames = (content: string) => {
  const tags = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = HASHTAG_PATTERN.exec(content))) {
    const normalized = normalizeTag(match[2]);

    if (normalized) {
      tags.add(normalized);
    }
  }

  return [...tags];
};

const getOrCreateHashtag = async (
  tx: Prisma.TransactionClient,
  name: string,
) => {
  try {
    return await tx.hashtag.upsert({
      where: {
        name,
      },
      update: {},
      create: {
        name,
      },
    });
  } catch (error) {
    if (isUniqueConstraintOn(error, ["name"])) {
      return tx.hashtag.findUniqueOrThrow({
        where: {
          name,
        },
      });
    }

    throw error;
  }
};

const syncPostHashtags = async (
  tx: Prisma.TransactionClient,
  postId: string,
  content: string,
) => {
  const names = extractHashtagNames(content);
  const hashtags = await Promise.all(
    names.map((name) => getOrCreateHashtag(tx, name)),
  );

  const existingLinks = await tx.postHashtag.findMany({
    where: {
      postId,
    },
    select: {
      hashtagId: true,
    },
  });

  const oldIds = new Set(existingLinks.map((item) => item.hashtagId));
  const newIds = new Set(hashtags.map((item) => item.id));

  const addedIds = [...newIds].filter((id) => !oldIds.has(id));
  const removedIds = [...oldIds].filter((id) => !newIds.has(id));

  if (addedIds.length) {
    await tx.postHashtag.createMany({
      data: addedIds.map((hashtagId) => ({
        postId,
        hashtagId,
      })),
      skipDuplicates: true,
    });

    await Promise.all(
      addedIds.map((id) =>
        tx.hashtag.update({
          where: {
            id,
          },
          data: {
            postCount: {
              increment: 1,
            },
          },
        }),
      ),
    );
  }

  if (removedIds.length) {
    await tx.postHashtag.deleteMany({
      where: {
        postId,
        hashtagId: {
          in: removedIds,
        },
      },
    });

    await decrementHashtagCounts(tx, removedIds);
  }
};

const decrementHashtagCounts = async (
  tx: Prisma.TransactionClient,
  hashtagIds: string[],
) => {
  await Promise.all(
    hashtagIds.map((id) =>
      tx.hashtag.updateMany({
        where: {
          id,
          postCount: {
            gt: 0,
          },
        },
        data: {
          postCount: {
            decrement: 1,
          },
        },
      }),
    ),
  );
};

const decrementPostHashtags = async (
  tx: Prisma.TransactionClient,
  postId: string,
) => {
  const links = await tx.postHashtag.findMany({
    where: {
      postId,
    },
    select: {
      hashtagId: true,
    },
  });

  await decrementHashtagCounts(
    tx,
    links.map((item) => item.hashtagId),
  );
};

export const HashtagService = {
  extractHashtagNames,
  syncPostHashtags,
  decrementPostHashtags,
};
