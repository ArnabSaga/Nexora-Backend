import status from "http-status";
import AppError from "../../shared/errors/AppError";
import {
  POST_UPLOAD_MAX_FILES,
  POST_UPLOAD_MAX_TOTAL_SIZE,
  POST_UPLOAD_MIME_TYPES,
  PROFILE_UPLOAD_MIME_TYPES,
  UPLOAD_MAX_FILE_SIZE,
  UPLOAD_MIME_BY_SIGNATURE,
} from "./upload.constant";
import type { TUploadSignature } from "./upload.interface";
import { detectUploadSignature } from "./upload.signature";

const validateFile = (
  file: Express.Multer.File,
  allowedMimeTypes: readonly string[],
): TUploadSignature => {
  if (!file.buffer.length) {
    throw new AppError(status.BAD_REQUEST, "Invalid file content");
  }
  if (file.buffer.length > UPLOAD_MAX_FILE_SIZE) {
    throw new AppError(
      status.BAD_REQUEST,
      `File size must not exceed ${UPLOAD_MAX_FILE_SIZE / (1024 * 1024)}MB`,
    );
  }
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new AppError(status.BAD_REQUEST, "Unsupported file type");
  }

  const signature = detectUploadSignature(file.buffer);
  if (!signature || UPLOAD_MIME_BY_SIGNATURE[signature] !== file.mimetype) {
    throw new AppError(status.BAD_REQUEST, "Invalid file content");
  }

  return signature;
};

export const validatePostMedia = (
  files: Express.Multer.File[] = [],
): TUploadSignature[] => {
  if (files.length > POST_UPLOAD_MAX_FILES) {
    throw new AppError(
      status.BAD_REQUEST,
      `You can upload up to ${POST_UPLOAD_MAX_FILES} files`,
    );
  }

  const totalBytes = files.reduce((sum, file) => sum + file.buffer.length, 0);
  if (totalBytes > POST_UPLOAD_MAX_TOTAL_SIZE) {
    throw new AppError(status.BAD_REQUEST, "Total upload size is too large");
  }

  return files.map((file) => validateFile(file, POST_UPLOAD_MIME_TYPES));
};

export const validateProfileImage = (
  file?: Express.Multer.File,
): TUploadSignature => {
  if (!file) {
    throw new AppError(status.BAD_REQUEST, "Uploaded file is required");
  }

  return validateFile(file, PROFILE_UPLOAD_MIME_TYPES);
};
