type TBookmarkReadDependencies = {
  getViewerBookmarks: (
    postIds: string[],
    viewerId: string,
  ) => Promise<Array<{ postId: string }>>;
};

export const createBookmarkReadService = ({
  getViewerBookmarks,
}: TBookmarkReadDependencies) => {
  const getPostBookmarkStates = async (
    postIds: string[],
    viewerId?: string,
  ): Promise<Map<string, boolean>> => {
    const ids = [...new Set(postIds)];
    const states = new Map(ids.map((id) => [id, false]));

    if (!ids.length || !viewerId) {
      return states;
    }

    const bookmarks = await getViewerBookmarks(ids, viewerId);

    for (const bookmark of bookmarks) {
      if (states.has(bookmark.postId)) {
        states.set(bookmark.postId, true);
      }
    }

    return states;
  };

  return { getPostBookmarkStates };
};

export type TBookmarkReadService = ReturnType<typeof createBookmarkReadService>;
