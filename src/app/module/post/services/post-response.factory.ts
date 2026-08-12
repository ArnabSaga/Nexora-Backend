import type {
  TOriginalPostPayload,
  TPostPayload,
} from "../constants/post.select";
import type { TPostResponse } from "../post.interface";
import {
  collectPostViewerStateTargetIds,
  mapAvailableOriginalPost,
  mapPost,
  mergePostBookmarkStates,
  mergePostVoteStates,
} from "../utils/post.utils";
import type { TVoteReadService } from "../../vote/vote-read.factory";
import type { TBookmarkReadService } from "../../bookmark/bookmark-read.factory";

type TPostResponseCollaborators = {
  findVisibleOriginalPosts: (
    originalIds: string[],
    viewer?: Express.AuthenticatedUser,
  ) => Promise<TOriginalPostPayload[]>;
  getPostVoteStates: TVoteReadService["getPostVoteStates"];
  getPostBookmarkStates: TBookmarkReadService["getPostBookmarkStates"];
};

export const createPostResponseService = ({
  findVisibleOriginalPosts,
  getPostVoteStates,
  getPostBookmarkStates,
}: TPostResponseCollaborators) => {
  const enrichPosts = async (
    posts: TPostPayload[],
    viewer?: Express.AuthenticatedUser,
  ): Promise<TPostResponse[]> => {
    if (!posts.length) {
      return [];
    }

    const mappedPosts = posts.map(mapPost);
    const originalIds = [
      ...new Set(
        posts.flatMap((post) => (post.repostId ? [post.repostId] : [])),
      ),
    ];
    const visibleOriginals = originalIds.length
      ? await findVisibleOriginalPosts(originalIds, viewer)
      : [];
    const originalMap = new Map(
      visibleOriginals.map((original) => [
        original.id,
        mapAvailableOriginalPost(original),
      ]),
    );
    const postsWithOriginals = mappedPosts.map((post): TPostResponse => {
      const originalPost = post.originalPost;

      if (!originalPost || !("unavailable" in originalPost)) {
        return post;
      }

      return {
        ...post,
        originalPost: originalMap.get(originalPost.id) ?? originalPost,
      };
    });
    const targetIds = collectPostViewerStateTargetIds(postsWithOriginals);
    const [voteStates, bookmarkStates] = await Promise.all([
      getPostVoteStates(targetIds, viewer?.id),
      getPostBookmarkStates(targetIds, viewer?.id),
    ]);

    return mergePostBookmarkStates(
      mergePostVoteStates(postsWithOriginals, voteStates),
      bookmarkStates,
    );
  };

  const enrichPost = async (
    post: TPostPayload,
    viewer?: Express.AuthenticatedUser,
  ): Promise<TPostResponse> => {
    const [result] = await enrichPosts([post], viewer);

    if (!result) {
      throw new Error("Post response enrichment produced no result");
    }

    return result;
  };

  return {
    enrichPost,
    enrichPosts,
  };
};

export type TPostResponseService = ReturnType<typeof createPostResponseService>;
