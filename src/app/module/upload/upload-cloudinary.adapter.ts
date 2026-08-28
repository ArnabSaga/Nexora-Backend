import { envVars } from "../../config/env";
import {
  cloudinary,
  getPublicIdFromUrl,
  uploadBufferToCloudinary,
} from "../../lib/cloudinary";
import type { TUploadedAsset, TUploadStorageAdapter } from "./upload.interface";
import { createUploadPublicId } from "./upload.util";

const destroy = async (publicId: string, resourceType: string) => {
  const result = await cloudinary.uploader.destroy(publicId, {
    invalidate: true,
    resource_type: resourceType,
  });

  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary asset deletion failed: ${result.result}`);
  }
};

const getUploadOptions = (
  input: Parameters<TUploadStorageAdapter["upload"]>[0],
) => {
  if (input.purpose === "POST_MEDIA") {
    return {
      folder: envVars.CLOUDINARY.POST_MEDIA_FOLDER,
      resource_type: "auto" as const,
      public_id: createUploadPublicId({
        purpose: input.purpose,
        originalName: input.file.originalname,
        ownerId: input.ownerId,
      }),
    };
  }

  return {
    folder:
      input.purpose === "PROFILE_AVATAR"
        ? envVars.CLOUDINARY.PROFILE_AVATAR_FOLDER
        : envVars.CLOUDINARY.PROFILE_COVER_FOLDER,
    resource_type: "image" as const,
    public_id: createUploadPublicId({
      purpose: input.purpose,
      originalName: input.file.originalname,
      ownerId: input.ownerId,
    }),
  };
};

export const CloudinaryUploadStorageAdapter: TUploadStorageAdapter = {
  upload: async (input): Promise<TUploadedAsset> => {
    const result = await uploadBufferToCloudinary(
      input.file.buffer,
      getUploadOptions(input),
    );

    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
    };
  },
  destroyUploadedAsset: (asset) => destroy(asset.publicId, asset.resourceType),
  destroyStoredAsset: async (storedUrl, purpose) => {
    const publicId = getPublicIdFromUrl(storedUrl);
    if (!publicId) {
      throw new Error("Stored Cloudinary asset URL is invalid");
    }

    await destroy(publicId, purpose === "POST_MEDIA" ? "auto" : "image");
  },
};
