import { MediaType } from "../../../generated/prisma/client";
import type {
  TUploadedAsset,
  TUploadedPostAsset,
  TUploadPurpose,
  TUploadStorageAdapter,
} from "./upload.interface";
import { validatePostMedia, validateProfileImage } from "./upload.validation";

class UploadCleanupError extends Error {
  readonly failedReferences: string[];

  constructor(failedReferences: string[]) {
    super("Upload asset cleanup partially failed");
    this.name = "UploadCleanupError";
    this.failedReferences = failedReferences;
  }
}

type TUploadServiceOptions = {
  warn?: (message: string, details: Record<string, unknown>) => void;
};

export const createUploadService = (
  storage: TUploadStorageAdapter,
  { warn = console.warn }: TUploadServiceOptions = {},
) => {
  const cleanupUploadedAssets = async (assets: TUploadedAsset[]) => {
    const results = await Promise.allSettled(
      assets.map((asset) => storage.destroyUploadedAsset(asset)),
    );
    const failedReferences = results.flatMap((result, index) =>
      result.status === "rejected" ? [assets[index]!.publicId] : [],
    );

    if (failedReferences.length) {
      throw new UploadCleanupError(failedReferences);
    }
  };

  const safeCleanupUploadedAssets = async (
    assets: TUploadedAsset[],
    operation: string,
  ) => {
    try {
      await cleanupUploadedAssets(assets);
    } catch (error) {
      warn("Upload asset cleanup failed", {
        operation,
        failedReferences:
          error instanceof UploadCleanupError
            ? error.failedReferences
            : assets.map((asset) => asset.publicId),
        message:
          error instanceof Error ? error.message : "Unknown cleanup error",
      });
    }
  };

  const safeDestroyStoredAsset = async (
    storedUrl: string,
    purpose: TUploadPurpose,
    operation: string,
  ) => {
    try {
      await storage.destroyStoredAsset(storedUrl, purpose);
    } catch (error) {
      warn("Stored upload asset cleanup failed", {
        operation,
        storedUrl,
        message:
          error instanceof Error ? error.message : "Unknown cleanup error",
      });
    }
  };

  const uploadPostMedia = async (
    files: Express.Multer.File[] = [],
  ): Promise<TUploadedPostAsset[]> => {
    const signatures = validatePostMedia(files);
    const uploaded: TUploadedPostAsset[] = [];

    try {
      for (const [index, file] of files.entries()) {
        const asset = await storage.upload({ file, purpose: "POST_MEDIA" });
        uploaded.push({
          ...asset,
          mediaType:
            signatures[index] === "PDF" ? MediaType.FILE : MediaType.IMAGE,
        });
      }
      return uploaded;
    } catch (error) {
      await safeCleanupUploadedAssets(
        uploaded,
        "partial-post-media-upload-failed",
      );
      throw error;
    }
  };

  const uploadProfileImage = async (input: {
    file?: Express.Multer.File;
    purpose: "PROFILE_AVATAR" | "PROFILE_COVER";
    ownerId: string;
  }) => {
    validateProfileImage(input.file);
    return storage.upload({
      file: input.file!,
      purpose: input.purpose,
      ownerId: input.ownerId,
    });
  };

  return {
    validatePostMedia,
    validateProfileImage,
    uploadPostMedia,
    uploadProfileImage,
    cleanupUploadedAssets,
    safeCleanupUploadedAssets,
    safeDestroyStoredAsset,
  };
};

export type TUploadService = ReturnType<typeof createUploadService>;
