import { v2 as cloudinary, UploadApiOptions } from "cloudinary";
import { envVars } from "../config/env";

cloudinary.config({
  cloud_name: envVars.CLOUDINARY.CLOUDINARY_CLOUD_NAME,
  api_key: envVars.CLOUDINARY.CLOUDINARY_API_KEY,
  api_secret: envVars.CLOUDINARY.CLOUDINARY_API_SECRET,
  secure: true,
});

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
    const finalSegmentWithoutExtension =
      stripFinalFilenameExtension(finalSegment);
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

export { cloudinary };
