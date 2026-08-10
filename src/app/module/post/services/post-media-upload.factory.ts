import type { TUploadedPostMedia } from "../post.interface";

type TPostMediaUploadDependencies = {
  uploadOne: (file: Express.Multer.File) => Promise<TUploadedPostMedia>;
  safeCleanupUploadedMedia: (
    media: TUploadedPostMedia[],
    operation: string,
  ) => Promise<void>;
};

export const createPostMediaUploadService = ({
  uploadOne,
  safeCleanupUploadedMedia,
}: TPostMediaUploadDependencies) => {
  const uploadFiles = async (files: Express.Multer.File[] = []) => {
    const uploaded: TUploadedPostMedia[] = [];

    try {
      for (const file of files) {
        uploaded.push(await uploadOne(file));
      }

      return uploaded;
    } catch (error) {
      await safeCleanupUploadedMedia(
        uploaded,
        "partial-post-media-upload-failed",
      );
      throw error;
    }
  };

  return { uploadFiles };
};
