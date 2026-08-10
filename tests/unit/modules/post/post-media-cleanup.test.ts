import assert from "node:assert/strict";
import test from "node:test";
import { MediaType } from "../../../../src/generated/prisma/client";
import { createPostMediaCleanupService } from "../../../../src/app/module/post/services/post-media-cleanup.factory";

const media = [
  {
    url: "https://example.test/first.jpg",
    publicId: "first-public-id",
    resourceType: "image",
    mediaType: MediaType.IMAGE,
  },
  {
    url: "https://example.test/second.jpg",
    publicId: "second-public-id",
    resourceType: "image",
    mediaType: MediaType.IMAGE,
  },
];

test("Post media cleanup reports rejected Cloudinary deletions", async () => {
  const warnings: Array<{
    message: string;
    details: Record<string, unknown>;
  }> = [];
  const service = createPostMediaCleanupService({
    destroy: async (item) => {
      if (item.publicId === "second-public-id") {
        throw new Error("destroy failed");
      }
    },
    warn: (message, details) => warnings.push({ message, details }),
  });

  await assert.rejects(
    service.cleanupUploadedMedia(media),
    /Post media cleanup partially failed/,
  );

  await service.safeCleanupUploadedMedia(media, "test-cleanup");

  assert.deepEqual(warnings, [
    {
      message: "Cloudinary post media cleanup failed",
      details: {
        operation: "test-cleanup",
        failedPublicIds: ["second-public-id"],
        message: "Post media cleanup partially failed",
      },
    },
  ]);
});

test("safe Post media cleanup resolves when every deletion succeeds", async () => {
  const destroyed: string[] = [];
  const warnings: unknown[] = [];
  const service = createPostMediaCleanupService({
    destroy: async (item) => {
      destroyed.push(item.publicId);
    },
    warn: (...args) => warnings.push(args),
  });

  await service.safeCleanupUploadedMedia(media, "test-cleanup");

  assert.deepEqual(destroyed, ["first-public-id", "second-public-id"]);
  assert.deepEqual(warnings, []);
});

test("Post media cleanup collects synchronous and asynchronous failures", async () => {
  const attempted: string[] = [];
  const warnings: Array<Record<string, unknown>> = [];
  const service = createPostMediaCleanupService({
    destroy: (item) => {
      attempted.push(item.publicId);

      if (item.publicId === "first-public-id") {
        throw new Error("sync failure");
      }

      return Promise.reject(new Error("async failure"));
    },
    warn: (_message, details) => warnings.push(details),
  });

  await service.safeCleanupUploadedMedia(media, "mixed-failure-cleanup");

  assert.deepEqual(attempted, ["first-public-id", "second-public-id"]);
  assert.deepEqual(warnings[0]?.failedPublicIds, [
    "first-public-id",
    "second-public-id",
  ]);
});
