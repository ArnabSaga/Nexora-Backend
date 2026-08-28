import type { TUploadService } from "../upload";
import type {
  TProfileMediaCasWriter,
  TProfileMediaField,
} from "./profile-media-cas.factory";

type TProfileMediaBindings = {
  uploadService: Pick<
    TUploadService,
    | "validateProfileImage"
    | "uploadProfileImage"
    | "safeCleanupUploadedAssets"
    | "safeDestroyStoredAsset"
  >;
  ensureProfileForUser(userId: string): Promise<{
    avatar: string | null;
    coverPhoto: string | null;
  }>;
  getOwnProfile(userId: string): Promise<unknown>;
  createCasWriter: () => TProfileMediaCasWriter;
};

const purposeForField = (field: TProfileMediaField) =>
  field === "avatar" ? ("PROFILE_AVATAR" as const) : ("PROFILE_COVER" as const);

export const createProfileMediaService = (bindings: TProfileMediaBindings) => {
  const replaceProfileMedia = async (input: {
    userId: string;
    file?: Express.Multer.File;
    field: TProfileMediaField;
  }) => {
    bindings.uploadService.validateProfileImage(input.file);
    const profile = await bindings.ensureProfileForUser(input.userId);
    const purpose = purposeForField(input.field);
    const uploaded = await bindings.uploadService.uploadProfileImage({
      file: input.file,
      purpose,
      ownerId: input.userId,
    });

    let claim: Awaited<ReturnType<TProfileMediaCasWriter["claim"]>>;
    try {
      claim = await bindings.createCasWriter().claim({
        userId: input.userId,
        field: input.field,
        initialExpectedUrl: profile[input.field],
        uploadedUrl: uploaded.url,
      });
    } catch (error) {
      await bindings.uploadService.safeCleanupUploadedAssets(
        [uploaded],
        "unclaimed-profile-media",
      );
      throw error;
    }

    if (claim.replacedUrl && claim.replacedUrl !== uploaded.url) {
      await bindings.uploadService.safeDestroyStoredAsset(
        claim.replacedUrl,
        purpose,
        "superseded-profile-media",
      );
    }

    return bindings.getOwnProfile(input.userId);
  };

  return {
    updateAvatar: (userId: string, file?: Express.Multer.File) =>
      replaceProfileMedia({ userId, file, field: "avatar" }),
    updateCover: (userId: string, file?: Express.Multer.File) =>
      replaceProfileMedia({ userId, file, field: "coverPhoto" }),
  };
};
