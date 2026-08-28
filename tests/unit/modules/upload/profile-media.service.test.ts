import assert from "node:assert/strict";
import test from "node:test";
import { createProfileMediaService } from "../../../../src/app/module/profile/profile-media.factory";

const file = { buffer: Buffer.from([0xff, 0xd8, 0xff]) } as Express.Multer.File;
const uploaded = {
  url: "https://example.test/new.jpg",
  publicId: "new-public-id",
  resourceType: "image",
};

const baseUploadService = () => ({
  validateProfileImage: () => "JPEG" as const,
  uploadProfileImage: async () => uploaded,
  safeCleanupUploadedAssets: async () => undefined,
  safeDestroyStoredAsset: async () => undefined,
});

test("Profile media validation runs before Profile creation", async () => {
  const calls: string[] = [];
  const service = createProfileMediaService({
    uploadService: {
      ...baseUploadService(),
      validateProfileImage: () => {
        calls.push("validate");
        throw new Error("invalid");
      },
    },
    ensureProfileForUser: async () => {
      calls.push("ensure");
      throw new Error("should not run");
    },
    getOwnProfile: async () => {
      throw new Error("should not run");
    },
    createCasWriter: () => ({
      claim: async () => {
        throw new Error("should not run");
      },
    }),
  });

  await assert.rejects(service.updateAvatar("user-1", file), /invalid/);
  assert.deepEqual(calls, ["validate"]);
});

test("Profile media cleans an upload when CAS fails and preserves error identity", async () => {
  const sentinel = new Error("claim failed");
  const cleaned: unknown[] = [];
  const service = createProfileMediaService({
    uploadService: {
      ...baseUploadService(),
      safeCleanupUploadedAssets: async (...args) => {
        cleaned.push(args);
      },
    },
    ensureProfileForUser: async () =>
      ({ avatar: "old", coverPhoto: null }) as never,
    getOwnProfile: async () => ({}) as never,
    createCasWriter: () => ({
      claim: async () => {
        throw sentinel;
      },
    }),
  });

  await assert.rejects(
    service.updateAvatar("user-1", file),
    (error) => error === sentinel,
  );
  assert.deepEqual(cleaned, [[[uploaded], "unclaimed-profile-media"]]);
});

test("claimed Profile asset survives old cleanup and response-read failure", async () => {
  const responseError = new Error("response failed");
  const newCleanup: unknown[] = [];
  const storedCleanup: unknown[] = [];
  const service = createProfileMediaService({
    uploadService: {
      ...baseUploadService(),
      safeCleanupUploadedAssets: async (...args) => {
        newCleanup.push(args);
      },
      safeDestroyStoredAsset: async (...args) => {
        storedCleanup.push(args);
      },
    },
    ensureProfileForUser: async () =>
      ({ avatar: "initial", coverPhoto: null }) as never,
    getOwnProfile: async () => {
      throw responseError;
    },
    createCasWriter: () => ({
      claim: async () => ({
        row: {
          userId: "user-1",
          avatar: uploaded.url,
          coverPhoto: null,
          updatedAt: new Date(),
        },
        replacedUrl: "winning-expected-url",
      }),
    }),
  });

  await assert.rejects(
    service.updateAvatar("user-1", file),
    (error) => error === responseError,
  );
  assert.deepEqual(newCleanup, []);
  assert.deepEqual(storedCleanup, [
    ["winning-expected-url", "PROFILE_AVATAR", "superseded-profile-media"],
  ]);
});
