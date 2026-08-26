export const UPLOAD_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const UPLOAD_MAX_FILE_SIZE_MB = 5;
export const POST_UPLOAD_MAX_FILES = 5;
export const POST_UPLOAD_MAX_TOTAL_SIZE =
  POST_UPLOAD_MAX_FILES * UPLOAD_MAX_FILE_SIZE;

export const UPLOAD_MIME_BY_SIGNATURE = {
  JPEG: "image/jpeg",
  PNG: "image/png",
  WEBP: "image/webp",
  PDF: "application/pdf",
} as const;

export const POST_UPLOAD_MIME_TYPES = Object.values(UPLOAD_MIME_BY_SIGNATURE);
export const PROFILE_UPLOAD_MIME_TYPES = [
  UPLOAD_MIME_BY_SIGNATURE.JPEG,
  UPLOAD_MIME_BY_SIGNATURE.PNG,
  UPLOAD_MIME_BY_SIGNATURE.WEBP,
] as const;
