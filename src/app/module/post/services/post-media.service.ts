import status from "http-status";
import { v2 as cloudinary } from "cloudinary";
import { UploadApiOptions } from "cloudinary";
import { envVars } from "../../../config/env";
import { uploadBufferToCloudinary } from "../../../lib/cloudinary";
import { FILE_UPLOAD } from "../../../shared/constants/upload.constant";
import AppError from "../../../shared/errors/AppError";
import {
  POST_MEDIA_MAX_FILES,
  POST_MEDIA_MAX_TOTAL_SIZE,
} from "../constants/post.constant";
import { getMediaTypeFromMime } from "../utils/post.utils";
import { createPostMediaCleanupService } from "./post-media-cleanup.factory";
import { createPostMediaUploadService } from "./post-media-upload.factory";

const PostMediaCleanupService = createPostMediaCleanupService({
  destroy: (item) =>
    cloudinary.uploader.destroy(item.publicId, {
      invalidate: true,
      resource_type: item.resourceType,
    }),
});

const PostMediaUploadService = createPostMediaUploadService({
  uploadOne: async (file) => {
    const options: UploadApiOptions = {
      folder: envVars.CLOUDINARY.POST_MEDIA_FOLDER,
      resource_type: "auto",
    };
    const result = await uploadBufferToCloudinary(file.buffer, options);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      mediaType: getMediaTypeFromMime(file.mimetype),
    };
  },
  safeCleanupUploadedMedia: PostMediaCleanupService.safeCleanupUploadedMedia,
});

const isJpeg = (buffer: Buffer) =>
  buffer.length >= 3 &&
  buffer[0] === 0xff &&
  buffer[1] === 0xd8 &&
  buffer[2] === 0xff;

const isPng = (buffer: Buffer) =>
  buffer.length >= 8 &&
  buffer[0] === 0x89 &&
  buffer[1] === 0x50 &&
  buffer[2] === 0x4e &&
  buffer[3] === 0x47 &&
  buffer[4] === 0x0d &&
  buffer[5] === 0x0a &&
  buffer[6] === 0x1a &&
  buffer[7] === 0x0a;

const isWebp = (buffer: Buffer) =>
  buffer.length >= 12 &&
  buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
  buffer.subarray(8, 12).toString("ascii") === "WEBP";

const isPdf = (buffer: Buffer) =>
  buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";

const isSignatureValid = (file: Express.Multer.File) => {
  switch (file.mimetype) {
    case "image/jpeg":
      return isJpeg(file.buffer);
    case "image/png":
      return isPng(file.buffer);
    case "image/webp":
      return isWebp(file.buffer);
    case "application/pdf":
      return isPdf(file.buffer);
    default:
      return false;
  }
};

const validateFiles = (files: Express.Multer.File[] = []) => {
  if (files.length > POST_MEDIA_MAX_FILES) {
    throw new AppError(
      status.BAD_REQUEST,
      `You can upload up to ${POST_MEDIA_MAX_FILES} files`,
    );
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  if (totalBytes > POST_MEDIA_MAX_TOTAL_SIZE) {
    throw new AppError(status.BAD_REQUEST, "Total upload size is too large");
  }

  files.forEach((file) => {
    const allowedMimeTypes: readonly string[] =
      FILE_UPLOAD.ALLOWED_POST_MEDIA_MIME_TYPES;

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError(status.BAD_REQUEST, "Only image or PDF files are allowed");
    }

    if (!isSignatureValid(file)) {
      throw new AppError(status.BAD_REQUEST, "Invalid file content");
    }
  });
};

export const PostMediaService = {
  validateFiles,
  uploadFiles: PostMediaUploadService.uploadFiles,
  cleanupUploadedMedia: PostMediaCleanupService.cleanupUploadedMedia,
  safeCleanupUploadedMedia: PostMediaCleanupService.safeCleanupUploadedMedia,
};
