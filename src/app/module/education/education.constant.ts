import { Prisma } from "../../../generated/prisma/client";

export const EDUCATION_SELECT = {
  id: true,
  institution: true,
  degree: true,
  fieldOfStudy: true,
  startDate: true,
  endDate: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EducationSelect;
