import { z } from "zod";
import { UserRole, UserStatus } from "../../../generated/prisma/client";

const queryNumber = (min: number, max?: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string" && typeof value !== "number") {
        return undefined;
      }

      return value;
    },
    max
      ? z.coerce.number().int().min(min).max(max)
      : z.coerce.number().int().min(min),
  );

const cuidSchema = z
  .string()
  .trim()
  .regex(/^c[a-z0-9]+$/i, "Invalid user id");

const paginationQuery = z.object({
  page: queryNumber(1).optional(),
  limit: queryNumber(1, 100).optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const idParam = z.object({
  id: cuidSchema,
});

const listUsersQuery = paginationQuery.extend({
  searchTerm: z.string().trim().optional(),
  role: z.enum(UserRole).optional(),
  status: z.enum(UserStatus).optional(),
});

const updateRole = z.object({
  role: z.enum(UserRole),
});

const updateStatus = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.SUSPENDED]),
});

export const UserValidation = {
  idParam,
  listUsersQuery,
  updateRole,
  updateStatus,
};
