import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { after, before, test } from "node:test";
import { prisma } from "../../../../src/app/lib/prisma";
import { createPrismaProfileMediaCasWriter } from "../../../../src/app/module/profile/profile-media-cas.prisma.factory";
import { createProfileMediaService } from "../../../../src/app/module/profile/profile-media.factory";
import { ProfileService } from "../../../../src/app/module/profile/profile.service";
import { createUploadService } from "../../../../src/app/module/upload/upload.factory";
import type {
  TUploadedAsset,
  TUploadStorageAdapter,
} from "../../../../src/app/module/upload/upload.interface";
import { createTestCleanup } from "../../../support/database/test-cleanup";
import { createTestUser } from "../../../support/fixtures/user.fixture";

const testRunId = process.env.TEST_RUN_ID;
if (!testRunId) {
  throw new Error("TEST_RUN_ID is required; use the integration test runner");
}

const cleanup = createTestCleanup();
const runId = `${testRunId}-upload`;
let user: Awaited<ReturnType<typeof createTestUser>>;

const createFile = (name: string): Express.Multer.File => {
  const buffer = Buffer.from([0xff, 0xd8, 0xff]);
  return {
    fieldname: "file",
    originalname: name,
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: buffer.length,
    destination: "",
    filename: "",
    path: "",
    buffer,
    stream: Readable.from([]),
  };
};

before(async () => {
  user = await createTestUser({ cleanup, runId, label: "profile-owner" });
});

after(async () => {
  try {
    await cleanup.run();
  } finally {
    await prisma.$disconnect();
  }
});

test("concurrent Profile replacements retain only the final claimed asset", async () => {
  const uploaded: TUploadedAsset[] = [];
  const destroyedUploaded = new Set<string>();
  const destroyedStored = new Set<string>();
  let sequence = 0;
  const adapter: TUploadStorageAdapter = {
    upload: async () => {
      sequence += 1;
      const asset = {
        url: `https://example.test/profile-${sequence}.jpg`,
        publicId: `profile-${sequence}`,
        resourceType: "image",
      };
      uploaded.push(asset);
      return asset;
    },
    destroyUploadedAsset: async (asset) => {
      destroyedUploaded.add(asset.url);
    },
    destroyStoredAsset: async (url) => {
      destroyedStored.add(url);
    },
  };
  const service = createProfileMediaService({
    uploadService: createUploadService(adapter),
    ensureProfileForUser: ProfileService.ensureProfileForUser,
    getOwnProfile: ProfileService.getOwnProfile,
    createCasWriter: () => createPrismaProfileMediaCasWriter(prisma),
  });

  const results = await Promise.all([
    service.updateAvatar(user.id, createFile("first.jpg")),
    service.updateAvatar(user.id, createFile("second.jpg")),
  ]);
  const profile = await prisma.profile.findUniqueOrThrow({
    where: { userId: user.id },
    select: { avatar: true },
  });
  const uploadedUrls = uploaded.map((asset) => asset.url);
  const nonFinalUrls = uploadedUrls.filter((url) => url !== profile.avatar);

  assert.equal(results.length, 2);
  assert.ok(profile.avatar && uploadedUrls.includes(profile.avatar));
  assert.equal(destroyedUploaded.has(profile.avatar), false);
  assert.equal(destroyedStored.has(profile.avatar), false);
  for (const url of nonFinalUrls) {
    assert.ok(destroyedUploaded.has(url) || destroyedStored.has(url));
  }
});
