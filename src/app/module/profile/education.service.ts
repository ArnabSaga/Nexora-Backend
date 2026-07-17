import status from "http-status";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import {
  assertDateRange,
  assertNotFutureDate,
  compareDateOnly,
  parseDateOnly,
} from "../../shared/helpers/dateOnly";
import { EDUCATION_SELECT } from "./profile.constant";
import {
  TCreateEducationPayload,
  TUpdateEducationPayload,
} from "./profile.interface";
import { mapEducation } from "./profile.utils";

const normalizeEducationPayload = (
  payload: TCreateEducationPayload | TUpdateEducationPayload,
  existing?: {
    startDate: Date | null;
    endDate: Date | null;
  },
) => {
  const startDate =
    payload.startDate !== undefined
      ? payload.startDate
        ? parseDateOnly(payload.startDate, "startDate")
        : null
      : (existing?.startDate ?? null);

  const endDate =
    payload.endDate !== undefined
      ? payload.endDate
        ? parseDateOnly(payload.endDate, "endDate")
        : null
      : (existing?.endDate ?? null);

  assertNotFutureDate(startDate, "startDate");
  assertNotFutureDate(endDate, "endDate");
  assertDateRange(startDate, endDate);

  return {
    startDate,
    endDate,
  };
};

const sortEducationRows = <
  T extends { endDate: Date | null; startDate: Date | null },
>(
  rows: T[],
) => {
  return [...rows].sort((left, right) => {
    if (!left.endDate && right.endDate) return -1;
    if (left.endDate && !right.endDate) return 1;

    const endDateComparison = compareDateOnly(right.endDate, left.endDate);
    if (endDateComparison !== 0) return endDateComparison;

    return compareDateOnly(right.startDate, left.startDate);
  });
};

export const getEducationRows = async (userId: string) => {
  const rows = await prisma.education.findMany({
    where: {
      userId,
    },
    orderBy: [
      { endDate: { sort: "desc", nulls: "first" } },
      { startDate: "desc" },
    ],
    select: EDUCATION_SELECT,
  });

  return sortEducationRows(rows);
};

const createEducation = async (
  userId: string,
  payload: TCreateEducationPayload,
) => {
  const dateData = normalizeEducationPayload(payload);

  const education = await prisma.education.create({
    data: {
      userId,
      institution: payload.institution,
      degree: payload.degree ?? null,
      fieldOfStudy: payload.fieldOfStudy ?? null,
      description: payload.description ?? null,
      ...dateData,
    },
    select: EDUCATION_SELECT,
  });

  return mapEducation(education);
};

const getMyEducation = async (userId: string) => {
  const education = await getEducationRows(userId);

  return education.map(mapEducation);
};

const updateEducation = async (
  userId: string,
  id: string,
  payload: TUpdateEducationPayload,
) => {
  const existing = await prisma.education.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      startDate: true,
      endDate: true,
    },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Education not found");
  }

  const dateData = normalizeEducationPayload(payload, existing);

  const education = await prisma.education.update({
    where: {
      id,
    },
    data: {
      ...(payload.institution !== undefined && {
        institution: payload.institution,
      }),
      ...(payload.degree !== undefined && { degree: payload.degree }),
      ...(payload.fieldOfStudy !== undefined && {
        fieldOfStudy: payload.fieldOfStudy,
      }),
      ...(payload.description !== undefined && {
        description: payload.description,
      }),
      ...dateData,
    },
    select: EDUCATION_SELECT,
  });

  return mapEducation(education);
};

const deleteEducation = async (userId: string, id: string) => {
  const result = await prisma.education.deleteMany({
    where: {
      id,
      userId,
    },
  });

  if (result.count === 0) {
    throw new AppError(status.NOT_FOUND, "Education not found");
  }

  return null;
};

export const EducationService = {
  createEducation,
  getMyEducation,
  updateEducation,
  deleteEducation,
};
