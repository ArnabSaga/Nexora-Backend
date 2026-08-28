import { randomUUID } from "node:crypto";
import type { TUploadPurpose } from "./upload.interface";

const sanitizeBasename = (originalName: string) =>
  originalName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 60)
    .replace(/^_+|_+$/g, "");

export const createUploadPublicId = (input: {
  purpose: TUploadPurpose;
  originalName: string;
  ownerId?: string;
}) => {
  const basename = sanitizeBasename(input.originalName);
  const suffix = basename ? `-${basename}` : "";
  const id = randomUUID();

  if (input.purpose === "POST_MEDIA") {
    return `post-${id}${suffix}`;
  }
  if (!input.ownerId) {
    throw new Error("Profile upload ownerId is required");
  }

  const prefix = input.purpose === "PROFILE_AVATAR" ? "avatar" : "cover";
  return `${prefix}-${input.ownerId}-${id}${suffix}`;
};
