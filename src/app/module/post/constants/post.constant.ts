import { FILE_UPLOAD } from "../../../shared/constants/upload.constant";

export const POST_MEDIA_MAX_FILES = 5;
export const POST_MEDIA_MAX_TOTAL_SIZE =
  POST_MEDIA_MAX_FILES * FILE_UPLOAD.MAX_FILE_SIZE;

export const POST_DEFAULT_LIMIT = 10;
export const POST_MAX_LIMIT = 50;

export const POST_CONTENT_MAX_LENGTH = 5000;

export const POST_CURSOR_VERSION = 1;
