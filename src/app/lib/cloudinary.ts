import type { Request } from "express";
import multer from "multer";
import { v2 as cloudinary, UploadApiOptions } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { envVars } from "../config/env";
import AppError from "../shared/errors/AppError";
import status from "http-status";
import { FILE_UPLOAD } from "../shared/constants/upload.constant";

cloudinary.config({
  cloud_name: envVars.CLOUDINARY.CLOUDINARY_CLOUD_NAME,
  api_key: envVars.CLOUDINARY.CLOUDINARY_API_KEY,
  api_secret: envVars.CLOUDINARY.CLOUDINARY_API_SECRET,
  secure: true,
});

const createSafePublicId = (prefix: string, originalName: string) => {
  const safeName = originalName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .slice(0, 80);

  return `${prefix}-${Date.now()}-${safeName}`;
};

export const imageFileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  callback,
) => {
  const allowedImageTypes: readonly string[] =
    FILE_UPLOAD.ALLOWED_IMAGE_MIME_TYPES;

  if (!allowedImageTypes.includes(file.mimetype)) {
    return callback(
      new AppError(
        status.BAD_REQUEST,
        "Only JPEG, PNG, or WEBP images are allowed",
      ),
    );
  }

  callback(null, true);
};

export const postMediaFileFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  callback,
) => {
  const allowedPostMediaTypes: readonly string[] =
    FILE_UPLOAD.ALLOWED_POST_MEDIA_MIME_TYPES;

  if (!allowedPostMediaTypes.includes(file.mimetype)) {
    return callback(
      new AppError(status.BAD_REQUEST, "Only image or PDF files are allowed"),
    );
  }

  callback(null, true);
};

export const uploadBufferToCloudinary = (
  buffer: Buffer,
  options: UploadApiOptions = {},
): Promise<{
  secure_url: string;
  public_id: string;
  bytes: number;
  resource_type: string;
}> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error("Cloudinary upload failed"));
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          bytes: result.bytes,
          resource_type: result.resource_type,
        });
      },
    );

    stream.end(buffer);
  });
};

export const postMediaStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    return {
      folder: envVars.CLOUDINARY.POST_MEDIA_FOLDER,
      resource_type: "auto",
      public_id: createSafePublicId("post", file.originalname),
    };
  },
});

export const profileAvatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: Request, file: Express.Multer.File) => {
    return {
      folder: envVars.CLOUDINARY.PROFILE_AVATAR_FOLDER,
      resource_type: "image",
      public_id: createSafePublicId(
        `avatar-${req.user?.id ?? "user"}`,
        file.originalname,
      ),
    };
  },
});

export const profileCoverStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: Request, file: Express.Multer.File) => {
    return {
      folder: envVars.CLOUDINARY.PROFILE_COVER_FOLDER,
      resource_type: "image",
      public_id: createSafePublicId(
        `cover-${req.user?.id ?? "user"}`,
        file.originalname,
      ),
    };
  },
});

const getPublicIdFromUrl = (fileUrl: string) => {
  try {
    const url = new URL(fileUrl);
    const uploadMarker = "/upload/";
    const markerIndex = url.pathname.indexOf(uploadMarker);

    if (markerIndex === -1) return null;

    let publicPath = url.pathname.slice(markerIndex + uploadMarker.length);
    publicPath = publicPath.replace(/^v\d+\//, "");
    publicPath = publicPath.replace(/\.[^/.]+$/, "");

    return publicPath || null;
  } catch {
    return null;
  }
};

export const destroyCloudinaryAssetByUrl = async (fileUrl: string) => {
  const publicId = getPublicIdFromUrl(fileUrl);

  if (!publicId) return false;

  const attempts: Array<"image" | "raw" | "video"> = ["image", "raw", "video"];

  for (const resourceType of attempts) {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        invalidate: true,
        resource_type: resourceType,
      });

      if (result.result === "ok") {
        return true;
      }

      if (result.result === "not found") {
        continue;
      }
    } catch {
      continue;
    }
  }

  return false;
};

export { cloudinary };
