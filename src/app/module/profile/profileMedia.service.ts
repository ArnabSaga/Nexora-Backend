import status from "http-status";
import { prisma } from "../../lib/prisma";
import {
  destroyCloudinaryAssetByUrl,
  getPublicIdFromUrl,
} from "../../lib/cloudinary";
import AppError from "../../shared/errors/AppError";
import { ProfileService } from "./profile.service";

const getUploadedFileUrl = (file?: Express.Multer.File) => {
  return file?.path;
};

const logCloudinaryCleanupFailure = (options: {
  operation: string;
  mediaType?: "avatar" | "coverPhoto";
  assetReference?: string;
  error: unknown;
}) => {
  const message =
    options.error instanceof Error
      ? options.error.message
      : String(options.error);

  console.warn(
    `[Cloudinary cleanup failed] operation=${options.operation} mediaType=${options.mediaType ?? "unknown"} publicId=${options.assetReference ?? "unknown-cloudinary-asset"} message=${message}`,
  );
};

const getSanitizedAssetReference = (assetUrl: string | null) => {
  if (!assetUrl) {
    return "unknown-cloudinary-asset";
  }

  return getPublicIdFromUrl(assetUrl) ?? "unknown-cloudinary-asset";
};

const cleanupNewUpload = async (
  file: Express.Multer.File,
  originalError: unknown,
) => {
  const fileUrl = getUploadedFileUrl(file);

  if (!fileUrl) {
    throw originalError;
  }

  try {
    await destroyCloudinaryAssetByUrl(fileUrl);
  } catch (cleanupError) {
    logCloudinaryCleanupFailure({
      operation: "delete-new-profile-media-after-db-failure",
      assetReference: file.filename,
      error: cleanupError,
    });
  }

  throw originalError;
};

const replaceProfileMedia = async (options: {
  userId: string;
  file?: Express.Multer.File;
  field: "avatar" | "coverPhoto";
}) => {
  const fileUrl = getUploadedFileUrl(options.file);

  if (!options.file || !fileUrl) {
    throw new AppError(status.BAD_REQUEST, "Uploaded file is required");
  }

  let previousAssetUrl: string | null = null;

  try {
    const profile = await ProfileService.ensureProfileForUser(options.userId);
    previousAssetUrl = profile[options.field];

    await prisma.profile.update({
      where: {
        userId: options.userId,
      },
      data: {
        [options.field]: fileUrl,
      },
    });
  } catch (error) {
    await cleanupNewUpload(options.file, error);
  }

  if (previousAssetUrl) {
    destroyCloudinaryAssetByUrl(previousAssetUrl).catch((error) => {
      logCloudinaryCleanupFailure({
        operation: "delete-old-profile-media",
        mediaType: options.field,
        assetReference: getSanitizedAssetReference(previousAssetUrl),
        error,
      });
    });
  }

  return ProfileService.getOwnProfile(options.userId);
};

const updateAvatar = async (userId: string, file?: Express.Multer.File) => {
  return replaceProfileMedia({
    userId,
    file,
    field: "avatar",
  });
};

const updateCover = async (userId: string, file?: Express.Multer.File) => {
  return replaceProfileMedia({
    userId,
    file,
    field: "coverPhoto",
  });
};

export const ProfileMediaService = {
  updateAvatar,
  updateCover,
};
