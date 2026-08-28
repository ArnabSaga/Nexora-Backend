import { createUploadService } from "./upload.factory";
import { CloudinaryUploadStorageAdapter } from "./upload-cloudinary.adapter";

export const UploadService = createUploadService(
  CloudinaryUploadStorageAdapter,
);
