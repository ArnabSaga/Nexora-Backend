import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import {
  POST_UPLOAD_MAX_FILES,
  UPLOAD_MAX_FILE_SIZE,
} from "../../../../src/app/module/upload/upload.constant";
import { detectUploadSignature } from "../../../../src/app/module/upload/upload.signature";
import {
  validatePostMedia,
  validateProfileImage,
} from "../../../../src/app/module/upload/upload.validation";

const signatures = {
  JPEG: Buffer.from([0xff, 0xd8, 0xff]),
  PNG: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  WEBP: Buffer.from("RIFF0000WEBP", "ascii"),
  PDF: Buffer.from("%PDF-", "ascii"),
} as const;

const createFile = (
  mimetype: string,
  buffer: Buffer,
  fieldname = "media",
): Express.Multer.File => ({
  fieldname,
  originalname: "fixture.bin",
  encoding: "7bit",
  mimetype,
  size: buffer.length,
  destination: "",
  filename: "",
  path: "",
  buffer,
  stream: Readable.from([]),
});

test("Upload signature detection recognizes only canonical magic bytes", () => {
  assert.equal(detectUploadSignature(signatures.JPEG), "JPEG");
  assert.equal(detectUploadSignature(signatures.PNG), "PNG");
  assert.equal(detectUploadSignature(signatures.WEBP), "WEBP");
  assert.equal(detectUploadSignature(signatures.PDF), "PDF");
  assert.equal(detectUploadSignature(Buffer.alloc(0)), null);
  assert.equal(detectUploadSignature(Buffer.from([0x89, 0x50])), null);
  assert.equal(detectUploadSignature(Buffer.from("not-media")), null);
});

test("Upload validation requires canonical MIME and matching bytes", () => {
  assert.deepEqual(
    validatePostMedia([
      createFile("image/jpeg", signatures.JPEG),
      createFile("image/png", signatures.PNG),
      createFile("image/webp", signatures.WEBP),
      createFile("application/pdf", signatures.PDF),
    ]),
    ["JPEG", "PNG", "WEBP", "PDF"],
  );
  assert.throws(
    () => validatePostMedia([createFile("image/jpg", signatures.JPEG)]),
    /Unsupported file type/,
  );
  assert.throws(
    () => validatePostMedia([createFile("image/jpeg", signatures.PNG)]),
    /Invalid file content/,
  );
  assert.throws(
    () => validatePostMedia([createFile("image/jpeg", Buffer.alloc(0))]),
    /Invalid file content/,
  );
});

test("Post media is optional while Profile media is required and image-only", () => {
  assert.deepEqual(validatePostMedia([]), []);
  assert.throws(
    () => validateProfileImage(undefined),
    /Uploaded file is required/,
  );
  assert.equal(
    validateProfileImage(createFile("image/jpeg", signatures.JPEG, "file")),
    "JPEG",
  );
  assert.throws(
    () =>
      validateProfileImage(
        createFile("application/pdf", signatures.PDF, "file"),
      ),
    /Unsupported file type/,
  );
});

test("Upload service boundary enforces count, per-file, and total guards", () => {
  const jpeg = () => createFile("image/jpeg", signatures.JPEG);
  assert.throws(
    () =>
      validatePostMedia(
        Array.from({ length: POST_UPLOAD_MAX_FILES + 1 }, jpeg),
      ),
    /upload up to 5 files/,
  );
  assert.throws(
    () =>
      validateProfileImage(
        createFile(
          "image/jpeg",
          Buffer.concat([signatures.JPEG, Buffer.alloc(UPLOAD_MAX_FILE_SIZE)]),
        ),
      ),
    /File size must not exceed 5MB/,
  );
  const overTotal = Array.from({ length: POST_UPLOAD_MAX_FILES }, () =>
    createFile(
      "image/jpeg",
      Buffer.concat([
        signatures.JPEG,
        Buffer.alloc(UPLOAD_MAX_FILE_SIZE - signatures.JPEG.length + 1),
      ]),
    ),
  );
  assert.throws(
    () => validatePostMedia(overTotal),
    /Total upload size is too large/,
  );
});
