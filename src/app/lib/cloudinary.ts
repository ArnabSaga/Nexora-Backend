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

const CLOUDINARY_DELIVERY_HOST = "res.cloudinary.com";
const CLOUDINARY_VERSION_SEGMENT_PATTERN = /^v\d+$/;
const CLOUDINARY_SIGNATURE_SEGMENT_PATTERN = /^s--[^/]+--$/;
const CLOUDINARY_TRANSFORMATION_SEGMENT_PATTERN =
  /^(?:a|ar|b|bo|c|co|cs|d|dl|dn|dpr|e|f|fl|fn|g|h|l|o|p|pg|q|r|so|sp|t|u|vc|vs|w|x|y|z)_[^/]+$/i;

const decodeCloudinaryPathSegment = (segment: string) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
};

const isUnsafePublicIdSegment = (segment: string) => {
  return (
    !segment ||
    !segment.trim() ||
    segment === "." ||
    segment === ".." ||
    segment.includes("\\") ||
    segment.includes("\0") ||
    segment.includes("?") ||
    segment.includes("#")
  );
};

const isTransformationOrSignatureSegment = (segment: string) => {
  return (
    segment.includes(",") ||
    CLOUDINARY_SIGNATURE_SEGMENT_PATTERN.test(segment) ||
    CLOUDINARY_TRANSFORMATION_SEGMENT_PATTERN.test(segment)
  );
};

const stripFinalFilenameExtension = (segment: string) => {
  const extensionIndex = segment.lastIndexOf(".");

  if (extensionIndex <= 0) {
    return segment;
  }

  return segment.slice(0, extensionIndex);
};

const validatePublicIdSegments = (segments: string[]) => {
  if (!segments.length) {
    return false;
  }

  return segments.every((segment) => !isUnsafePublicIdSegment(segment));
};

export const getPublicIdFromUrl = (fileUrl: string) => {
  try {
    const url = new URL(fileUrl);

    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !== CLOUDINARY_DELIVERY_HOST
    ) {
      return null;
    }

    const rawPathSegments = url.pathname.split("/").filter(Boolean);
    const cloudName = decodeCloudinaryPathSegment(rawPathSegments[0] ?? "");

    if (
      cloudName !== envVars.CLOUDINARY.CLOUDINARY_CLOUD_NAME ||
      rawPathSegments[1] !== "image" ||
      rawPathSegments[2] !== "upload"
    ) {
      return null;
    }

    const decodedAssetSegments = rawPathSegments
      .slice(3)
      .map(decodeCloudinaryPathSegment);

    if (decodedAssetSegments.some((segment) => segment === null)) {
      return null;
    }

    const assetSegments = decodedAssetSegments as string[];
    const versionIndex = assetSegments.findIndex((segment) =>
      CLOUDINARY_VERSION_SEGMENT_PATTERN.test(segment),
    );
    const publicIdSegments =
      versionIndex >= 0 ? assetSegments.slice(versionIndex + 1) : assetSegments;

    if (
      versionIndex === -1 &&
      assetSegments.some(isTransformationOrSignatureSegment)
    ) {
      return null;
    }

    if (!validatePublicIdSegments(publicIdSegments)) {
      return null;
    }

    const finalSegment = publicIdSegments[publicIdSegments.length - 1];
    const finalSegmentWithoutExtension = stripFinalFilenameExtension(
      finalSegment,
    );
    const sanitizedPublicIdSegments = [
      ...publicIdSegments.slice(0, -1),
      finalSegmentWithoutExtension,
    ];

    if (!validatePublicIdSegments(sanitizedPublicIdSegments)) {
      return null;
    }

    return sanitizedPublicIdSegments.join("/");
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
