import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { MediaType } from "../../../../src/generated/prisma/client";
import { createPostMediaCleanupService } from "../../../../src/app/module/post/services/post-media-cleanup.factory";
import { createPostMediaUploadService } from "../../../../src/app/module/post/services/post-media-upload.factory";

const createFile = (name: string): Express.Multer.File => ({
  fieldname: "media",
  originalname: name,
  encoding: "7bit",
  mimetype: "image/jpeg",
  size: 3,
  destination: "",
  filename: name,
  path: "",
  buffer: Buffer.from([0xff, 0xd8, 0xff]),
  stream: Readable.from([]),
});

const uploaded = (name: string) => ({
  url: `https://example.test/${name}`,
  publicId: `public-${name}`,
  resourceType: "image",
  mediaType: MediaType.IMAGE,
});

test("Post media upload returns all assets without cleanup", async () => {
  const cleanupCalls: unknown[] = [];
  const service = createPostMediaUploadService({
    uploadOne: async (file) => uploaded(file.originalname),
    safeCleanupUploadedMedia: async (...args) => {
      cleanupCalls.push(args);
    },
  });

  const result = await service.uploadFiles([
    createFile("first.jpg"),
    createFile("second.jpg"),
  ]);

  assert.deepEqual(result, [uploaded("first.jpg"), uploaded("second.jpg")]);
  assert.deepEqual(cleanupCalls, []);
});

test("partial upload cleans successful assets and preserves error identity", async () => {
  const originalError = new Error("third upload failed");
  const cleanupCalls: unknown[][] = [];
  const service = createPostMediaUploadService({
    uploadOne: async (file) => {
      if (file.originalname === "third.jpg") {
        throw originalError;
      }

      return uploaded(file.originalname);
    },
    safeCleanupUploadedMedia: async (...args) => {
      cleanupCalls.push(args);
    },
  });

  await assert.rejects(
    service.uploadFiles([
      createFile("first.jpg"),
      createFile("second.jpg"),
      createFile("third.jpg"),
    ]),
    (error) => error === originalError,
  );
  assert.deepEqual(cleanupCalls, [
    [
      [uploaded("first.jpg"), uploaded("second.jpg")],
      "partial-post-media-upload-failed",
    ],
  ]);
});

test("cleanup failure cannot replace the original upload error", async () => {
  const originalError = new Error("second upload failed");
  const warnings: unknown[][] = [];
  const cleanupService = createPostMediaCleanupService({
    destroy: () => {
      throw new Error("destroy failed");
    },
    warn: (...args) => warnings.push(args),
  });
  const service = createPostMediaUploadService({
    uploadOne: async (file) => {
      if (file.originalname === "second.jpg") {
        throw originalError;
      }

      return uploaded(file.originalname);
    },
    safeCleanupUploadedMedia: cleanupService.safeCleanupUploadedMedia,
  });

  await assert.rejects(
    service.uploadFiles([createFile("first.jpg"), createFile("second.jpg")]),
    (error) => error === originalError,
  );
  assert.equal(warnings.length, 1);
});
