import { z } from "zod";

const cuidSchema = z
  .string()
  .trim()
  .regex(/^c[a-z0-9]+$/i, "Invalid id");

const idParam = z.object({
  id: cuidSchema,
});

const create = z
  .object({
    name: z.string().trim().min(1).max(100),
  })
  .strict();

export const SkillValidation = {
  idParam,
  create,
};
