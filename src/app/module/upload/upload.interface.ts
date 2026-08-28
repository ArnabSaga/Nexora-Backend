import type { MediaType } from "../../../generated/prisma/client";

export type TUploadPurpose = "POST_MEDIA" | "PROFILE_AVATAR" | "PROFILE_COVER";

export type TUploadSignature = "JPEG" | "PNG" | "WEBP" | "PDF";

export type TUploadedAsset = {
  url: string;
  publicId: string;
  resourceType: string;
};

export type TUploadedPostAsset = TUploadedAsset & {
  mediaType: MediaType;
};

export type TUploadRequest =
  | {
      file: Express.Multer.File;
      purpose: "POST_MEDIA";
      ownerId?: string;
    }
  | {
      file: Express.Multer.File;
      purpose: "PROFILE_AVATAR" | "PROFILE_COVER";
      ownerId: string;
    };

export type TUploadStorageAdapter = {
  upload(input: TUploadRequest): Promise<TUploadedAsset>;
  destroyUploadedAsset(asset: TUploadedAsset): Promise<void>;
  destroyStoredAsset(storedUrl: string, purpose: TUploadPurpose): Promise<void>;
};
