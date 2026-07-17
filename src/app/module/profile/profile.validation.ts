import { z } from "zod";
import {
  isReservedUsername,
  normalizeUsername,
  USERNAME_PATTERN,
} from "../../shared/helpers/username";

const nullableTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

const usernameSchema = z
  .string()
  .trim()
  .transform(normalizeUsername)
  .refine((value) => USERNAME_PATTERN.test(value), {
    message:
      "Username must be 3-30 lowercase letters, numbers, dots, underscores, or hyphens without adjacent separators",
  })
  .refine((value) => !isReservedUsername(value), {
    message: "This username is reserved",
  });

const usernameParam = z.object({
  username: usernameSchema,
});

const updateProfile = z
  .object({
    username: usernameSchema.optional(),
    bio: nullableTrimmedString(500),
    headline: nullableTrimmedString(160),
    location: nullableTrimmedString(120),
    website: z
      .string()
      .trim()
      .url()
      .max(200)
      .transform((value) => (value === "" ? null : value))
      .nullable()
      .optional(),
    profession: nullableTrimmedString(120),
    company: nullableTrimmedString(120),
  })
  .strict();

export const ProfileValidation = {
  usernameParam,
  updateProfile,
};
