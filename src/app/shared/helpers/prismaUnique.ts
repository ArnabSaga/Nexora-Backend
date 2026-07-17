import { Prisma } from "../../../generated/prisma/client";

const normalizeTargetPart = (value: string) => value.toLowerCase();

const getTargetParts = (error: Prisma.PrismaClientKnownRequestError) => {
  const target = error.meta?.target ?? error.meta?.constraint;

  if (Array.isArray(target)) {
    return target.map((item) => normalizeTargetPart(String(item)));
  }

  if (typeof target === "string") {
    return [normalizeTargetPart(target)];
  }

  return [];
};

export const isPrismaUniqueConstraintError = (
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
};

export const isUniqueConstraintOn = (
  error: unknown,
  fields: string[],
): error is Prisma.PrismaClientKnownRequestError => {
  if (!isPrismaUniqueConstraintError(error)) {
    return false;
  }

  const targetParts = getTargetParts(error);
  const normalizedFields = fields.map((field) => normalizeTargetPart(field));

  return normalizedFields.every((field) =>
    targetParts.some((target) => target.includes(field)),
  );
};
