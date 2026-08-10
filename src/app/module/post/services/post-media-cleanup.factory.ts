import type { TUploadedPostMedia } from "../post.interface";

type TPostMediaCleanupDependencies = {
  destroy: (media: TUploadedPostMedia) => Promise<unknown>;
  warn?: (message: string, details: Record<string, unknown>) => void;
};

class PostMediaCleanupError extends Error {
  readonly failedPublicIds: string[];

  constructor(failedPublicIds: string[]) {
    super("Post media cleanup partially failed");
    this.name = "PostMediaCleanupError";
    this.failedPublicIds = failedPublicIds;
  }
}

export const createPostMediaCleanupService = ({
  destroy,
  warn = console.warn,
}: TPostMediaCleanupDependencies) => {
  const cleanupUploadedMedia = async (media: TUploadedPostMedia[]) => {
    const results = await Promise.allSettled(
      media.map((item) => Promise.resolve().then(() => destroy(item))),
    );
    const failedPublicIds = results.flatMap((result, index) =>
      result.status === "rejected" ? [media[index]!.publicId] : [],
    );

    if (failedPublicIds.length) {
      throw new PostMediaCleanupError(failedPublicIds);
    }
  };

  const safeCleanupUploadedMedia = async (
    media: TUploadedPostMedia[],
    operation: string,
  ) => {
    try {
      await cleanupUploadedMedia(media);
    } catch (error) {
      warn("Cloudinary post media cleanup failed", {
        operation,
        failedPublicIds:
          error instanceof PostMediaCleanupError
            ? error.failedPublicIds
            : media.map((item) => item.publicId),
        message:
          error instanceof Error ? error.message : "Unknown cleanup error",
      });
    }
  };

  return {
    cleanupUploadedMedia,
    safeCleanupUploadedMedia,
  };
};
