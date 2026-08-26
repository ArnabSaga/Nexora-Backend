import { prisma } from "../../lib/prisma";
import { UploadService } from "../upload";
import { createProfileMediaService } from "./profile-media.factory";
import { createPrismaProfileMediaCasWriter } from "./profile-media-cas.prisma.factory";
import { ProfileService } from "./profile.service";

export const ProfileMediaService = createProfileMediaService({
  uploadService: UploadService,
  ensureProfileForUser: ProfileService.ensureProfileForUser,
  getOwnProfile: ProfileService.getOwnProfile,
  createCasWriter: () => createPrismaProfileMediaCasWriter(prisma),
});
