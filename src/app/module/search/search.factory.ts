import { SearchType } from "./search.constant";
import type {
  TGlobalSearchResult,
  TSearchQuery,
  TSearchReader,
  TTypedGlobalSearchResult,
} from "./search.interface";
import { normalizeSearchQuery } from "./search.util";

export const createSearchService = (reader: TSearchReader) => {
  const searchUsers = (
    query: TSearchQuery,
    viewer?: Express.AuthenticatedUser,
  ) =>
    reader.searchUsers(
      normalizeSearchQuery(query, { allowType: false }),
      viewer,
    );
  const searchPosts = (
    query: TSearchQuery,
    viewer?: Express.AuthenticatedUser,
  ) =>
    reader.searchPosts(
      normalizeSearchQuery(query, { allowType: false }),
      viewer,
    );
  const searchCommunities = (
    query: TSearchQuery,
    viewer?: Express.AuthenticatedUser,
  ) =>
    reader.searchCommunities(
      normalizeSearchQuery(query, { allowType: false }),
      viewer,
    );

  const search = async (
    query: TSearchQuery,
    viewer?: Express.AuthenticatedUser,
  ): Promise<TGlobalSearchResult | TTypedGlobalSearchResult> => {
    const normalized = normalizeSearchQuery(query, { allowType: true });

    switch (normalized.type) {
      case SearchType.USER:
        return { users: await reader.searchUsers(normalized, viewer) };
      case SearchType.POST:
        return { posts: await reader.searchPosts(normalized, viewer) };
      case SearchType.COMMUNITY:
        return {
          communities: await reader.searchCommunities(normalized, viewer),
        };
      case SearchType.HASHTAG:
        return { hashtags: await reader.searchHashtags(normalized, viewer) };
      default: {
        const [users, posts, communities, hashtags] = await Promise.all([
          reader.searchUsers(normalized, viewer),
          reader.searchPosts(normalized, viewer),
          reader.searchCommunities(normalized, viewer),
          reader.searchHashtags(normalized, viewer),
        ]);
        return { users, posts, communities, hashtags };
      }
    }
  };

  return { search, searchUsers, searchPosts, searchCommunities };
};

export type TSearchService = ReturnType<typeof createSearchService>;
