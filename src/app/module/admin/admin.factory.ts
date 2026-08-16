import type { TAdminReader } from "./admin.interface";
import type { TCommunityStatusWriter } from "./community-status.factory";
import {
  normalizeAdminCommunityQuery,
  normalizeAdminCommunityId,
  normalizeAdminCommunityStatus,
  normalizeAdminPostQuery,
} from "./admin.util";

export const createAdminService = (
  reader: TAdminReader,
  communityStatusWriter: TCommunityStatusWriter,
) => ({
  getDashboard: () => reader.getDashboard(),
  getPosts: (query: unknown) => reader.getPosts(normalizeAdminPostQuery(query)),
  getCommunities: (query: unknown) =>
    reader.getCommunities(normalizeAdminCommunityQuery(query)),
  updateCommunityStatus: (id: unknown, status: unknown) =>
    communityStatusWriter.updateStatus(
      normalizeAdminCommunityId(id),
      normalizeAdminCommunityStatus(status),
    ),
});
