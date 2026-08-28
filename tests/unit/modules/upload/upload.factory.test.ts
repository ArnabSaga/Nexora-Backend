import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { MediaType } from "../../../../src/generated/prisma/client";
import { createUploadService } from "../../../../src/app/module/upload/upload.factory";
import type {
  TUploadedAsset,
  TUploadStorageAdapter,
} from "../../../../src/app/module/upload/upload.interface";
import { createUploadPublicId } from "../../../../src/app/module/upload/upload.util";

const createFile = (name: string, pdf = false): Express.Multer.File => {
  const buffer = pdf
    ? Buffer.from("%PDF-", "ascii")
    : Buffer.from([0xff, 0xd8, 0xff]);
  return {
    fieldname: "media",
    originalname: name,
    encoding: "7bit",
    mimetype: pdf ? "application/pdf" : "image/jpeg",
    size: buffer.length,
    destination: "",
    filename: "",
    path: "",
    buffer,
    stream: Readable.from([]),
  };
};

const asset = (name: string): TUploadedAsset => ({
  url: `https://example.test/${name}`,
  publicId: `public-${name}`,
  resourceType: "image",
});

test("Upload service preserves Post order and maps domain media types", async () => {
  const adapter: TUploadStorageAdapter = {
    upload: async ({ file }) => asset(file.originalname),
    destroyUploadedAsset: async () => undefined,
    destroyStoredAsset: async () => undefined,
  };
  const service = createUploadService(adapter);
  const result = await service.uploadPostMedia([
    createFile("first.jpg"),
    createFile("guide.pdf", true),
  ]);

  assert.deepEqual(result, [
    { ...asset("first.jpg"), mediaType: MediaType.IMAGE },
    { ...asset("guide.pdf"), mediaType: MediaType.FILE },
  ]);
});

test("partial upload cleans exact descriptors and preserves error identity", async () => {
  const sentinel = new Error("upload failed");
  const destroyed: TUploadedAsset[] = [];
  const adapter: TUploadStorageAdapter = {
    upload: async ({ file }) => {
      if (file.originalname === "second.jpg") throw sentinel;
      return asset(file.originalname);
    },
    destroyUploadedAsset: async (uploaded) => {
      destroyed.push(uploaded);
    },
    destroyStoredAsset: async () => undefined,
  };

  await assert.rejects(
    createUploadService(adapter).uploadPostMedia([
      createFile("first.jpg"),
      createFile("second.jpg"),
    ]),
    (error) => error === sentinel,
  );
  assert.deepEqual(destroyed, [
    { ...asset("first.jpg"), mediaType: MediaType.IMAGE },
  ]);
});

test("best-effort cleanup reports failures and stored cleanup stays distinct", async () => {
  const warnings: unknown[][] = [];
  const storedCalls: unknown[][] = [];
  const adapter: TUploadStorageAdapter = {
    upload: async ({ file }) => asset(file.originalname),
    destroyUploadedAsset: async () => {
      throw new Error("destroy failed");
    },
    destroyStoredAsset: async (...args) => {
      storedCalls.push(args);
    },
  };
  const service = createUploadService(adapter, {
    warn: (...args) => warnings.push(args),
  });

  await service.safeCleanupUploadedAssets([asset("one")], "rollback");
  await service.safeDestroyStoredAsset(
    "https://example.test/old.jpg",
    "PROFILE_AVATAR",
    "replace",
  );
  assert.equal(warnings.length, 1);
  assert.deepEqual(storedCalls, [
    ["https://example.test/old.jpg", "PROFILE_AVATAR"],
  ]);
});

test("public IDs use purpose, owner, sanitized names, and unique entropy", () => {
  const first = createUploadPublicId({
    purpose: "PROFILE_AVATAR",
    ownerId: "user-1",
    originalName: "my portrait!!.jpg",
  });
  const second = createUploadPublicId({
    purpose: "PROFILE_AVATAR",
    ownerId: "user-1",
    originalName: "my portrait!!.jpg",
  });
  assert.match(first, /^avatar-user-1-[0-9a-f-]+-my_portrait$/);
  assert.notEqual(first, second);
  assert.throws(
    () =>
      createUploadPublicId({
        purpose: "PROFILE_COVER",
        originalName: "cover.jpg",
      }),
    /ownerId is required/,
  );
});
