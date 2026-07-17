import { z } from "zod";
import {
  isReservedUsername,
  normalizeUsername,
  USERNAME_PATTERN,
} from "../../shared/helpers/username";
import { isValidDateOnlyString } from "../../shared/helpers/dateOnly";

const cuidSchema = z
  .string()
  .trim()
  .regex(/^c[a-z0-9]+$/i, "Invalid id");

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

const dateOnlySchema = z.string().trim().refine(isValidDateOnlyString, {
  message: "Date must be a valid YYYY-MM-DD date",
});

const optionalDateOnlySchema = dateOnlySchema.nullable().optional();

const idParam = z.object({
  id: cuidSchema,
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

const createExperience = z
  .object({
    title: z.string().trim().min(1).max(120),
    company: z.string().trim().min(1).max(120),
    location: nullableTrimmedString(120),
    startDate: dateOnlySchema,
    endDate: optionalDateOnlySchema,
    isCurrent: z.boolean().optional(),
    description: nullableTrimmedString(1000),
  })
  .strict();

const updateExperience = createExperience.partial().strict();

const createEducation = z
  .object({
    institution: z.string().trim().min(1).max(160),
    degree: nullableTrimmedString(120),
    fieldOfStudy: nullableTrimmedString(120),
    startDate: optionalDateOnlySchema,
    endDate: optionalDateOnlySchema,
    description: nullableTrimmedString(1000),
  })
  .strict();

const updateEducation = createEducation.partial().strict();

const createSkill = z
  .object({
    name: z.string().trim().min(1).max(100),
  })
  .strict();

export const ProfileValidation = {
  idParam,
  usernameParam,
  updateProfile,
  createExperience,
  updateExperience,
  createEducation,
  updateEducation,
  createSkill,
};
