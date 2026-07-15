export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  MAX_FILE_SIZE_MB: 5,
  ALLOWED_IMAGE_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"],
  ALLOWED_DOCUMENT_MIME_TYPES: ["application/pdf"],
  ALLOWED_POST_MEDIA_MIME_TYPES: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
} as const;

export const CLOUDINARY_FOLDER = {
  POST_MEDIA: "nexora/posts",
  PROFILE_AVATAR: "nexora/profiles/avatars",
  PROFILE_COVER: "nexora/profiles/covers",
} as const;
