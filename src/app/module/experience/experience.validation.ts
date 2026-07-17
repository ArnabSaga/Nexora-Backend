import { z } from "zod";
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

const dateOnlySchema = z.string().trim().refine(isValidDateOnlyString, {
  message: "Date must be a valid YYYY-MM-DD date",
});

const optionalDateOnlySchema = dateOnlySchema.nullable().optional();

const idParam = z.object({
  id: cuidSchema,
});

const create = z
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

const update = create.partial().strict();

export const ExperienceValidation = {
  idParam,
  create,
  update,
};
