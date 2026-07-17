import { Prisma } from "../../../generated/prisma/client";

export const EXPERIENCE_SELECT = {
  id: true,
  title: true,
  company: true,
  location: true,
  startDate: true,
  endDate: true,
  isCurrent: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ExperienceSelect;
