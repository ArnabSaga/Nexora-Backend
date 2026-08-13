import { extractHashtagNames } from "./hashtag.util";

type THashtagIdentity = { id: string };
type TPostHashtagIdentity = { hashtagId: string };

type THashtagWriteDependencies = {
  getOrCreateHashtag: (name: string) => Promise<THashtagIdentity>;
  findPostHashtags: (postId: string) => Promise<TPostHashtagIdentity[]>;
  createPostHashtags: (
    postId: string,
    hashtagIds: string[],
  ) => Promise<TPostHashtagIdentity[]>;
  deletePostHashtag: (postId: string, hashtagId: string) => Promise<number>;
  incrementHashtag: (hashtagId: string) => Promise<void>;
  decrementHashtag: (hashtagId: string) => Promise<void>;
};

export const createHashtagWriter = (
  dependencies: THashtagWriteDependencies,
) => {
  const syncPostHashtags = async (postId: string, content: string) => {
    const hashtags = await Promise.all(
      extractHashtagNames(content).map(dependencies.getOrCreateHashtag),
    );
    const existing = await dependencies.findPostHashtags(postId);
    const oldIds = new Set(existing.map((item) => item.hashtagId));
    const newIds = new Set(hashtags.map((item) => item.id));
    const addedIds = [...newIds].filter((id) => !oldIds.has(id));
    const removedIds = [...oldIds].filter((id) => !newIds.has(id));

    if (addedIds.length) {
      const inserted = await dependencies.createPostHashtags(postId, addedIds);
      await Promise.all(
        inserted.map((item) => dependencies.incrementHashtag(item.hashtagId)),
      );
    }

    await Promise.all(
      removedIds.map(async (hashtagId) => {
        const count = await dependencies.deletePostHashtag(postId, hashtagId);
        if (count === 1) await dependencies.decrementHashtag(hashtagId);
      }),
    );
  };

  const decrementPostHashtags = async (postId: string) => {
    const links = await dependencies.findPostHashtags(postId);
    await Promise.all(
      links.map((item) => dependencies.decrementHashtag(item.hashtagId)),
    );
  };

  return { syncPostHashtags, decrementPostHashtags };
};

export type THashtagWriter = ReturnType<typeof createHashtagWriter>;
