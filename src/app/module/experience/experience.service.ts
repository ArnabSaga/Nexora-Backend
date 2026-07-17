import status from "http-status";
import { prisma } from "../../lib/prisma";
import AppError from "../../shared/errors/AppError";
import {
  assertDateRange,
  assertNotFutureDate,
  parseDateOnly,
} from "../../shared/helpers/dateOnly";
import { EXPERIENCE_SELECT } from "./experience.constant";
import {
  TCreateExperiencePayload,
  TUpdateExperiencePayload,
} from "./experience.interface";
import { mapExperience } from "./experience.utils";

const normalizeExperiencePayload = (
  payload: TCreateExperiencePayload | TUpdateExperiencePayload,
  existing?: {
    startDate: Date;
    endDate: Date | null;
    isCurrent: boolean;
  },
) => {
  const startDate =
    payload.startDate !== undefined
      ? parseDateOnly(payload.startDate, "startDate")
      : existing?.startDate;

  let endDate =
    payload.endDate !== undefined
      ? payload.endDate
        ? parseDateOnly(payload.endDate, "endDate")
        : null
      : existing?.endDate;

  let isCurrent = payload.isCurrent ?? existing?.isCurrent ?? false;

  if (payload.endDate && payload.isCurrent === undefined) {
    isCurrent = false;
  }

  if (isCurrent) {
    endDate = null;
  }

  if (!startDate) {
    throw new AppError(status.BAD_REQUEST, "startDate is required");
  }

  if (!isCurrent && !endDate) {
    throw new AppError(
      status.BAD_REQUEST,
      "endDate is required when experience is not current",
    );
  }

  assertNotFutureDate(startDate, "startDate");
  assertNotFutureDate(endDate, "endDate");
  assertDateRange(startDate, endDate);

  return {
    startDate,
    endDate,
    isCurrent,
  };
};

const experienceOrderBy = [
  { isCurrent: "desc" as const },
  { endDate: { sort: "desc" as const, nulls: "first" as const } },
  { startDate: "desc" as const },
];

const getExperienceRows = async (userId: string) => {
  return prisma.experience.findMany({
    where: {
      userId,
    },
    orderBy: experienceOrderBy,
    select: EXPERIENCE_SELECT,
  });
};

const create = async (userId: string, payload: TCreateExperiencePayload) => {
  const dateData = normalizeExperiencePayload(payload);

  const experience = await prisma.experience.create({
    data: {
      userId,
      title: payload.title,
      company: payload.company,
      location: payload.location ?? null,
      description: payload.description ?? null,
      ...dateData,
    },
    select: EXPERIENCE_SELECT,
  });

  return mapExperience(experience);
};

const getOwn = async (userId: string) => {
  const experiences = await getExperienceRows(userId);

  return experiences.map(mapExperience);
};

const getPublic = async (userId: string) => {
  return getOwn(userId);
};

const update = async (
  userId: string,
  id: string,
  payload: TUpdateExperiencePayload,
) => {
  const existing = await prisma.experience.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      startDate: true,
      endDate: true,
      isCurrent: true,
    },
  });

  if (!existing) {
    throw new AppError(status.NOT_FOUND, "Experience not found");
  }

  const dateData = normalizeExperiencePayload(payload, existing);

  const experience = await prisma.experience.update({
    where: {
      id,
    },
    data: {
      ...(payload.title !== undefined && { title: payload.title }),
      ...(payload.company !== undefined && { company: payload.company }),
      ...(payload.location !== undefined && { location: payload.location }),
      ...(payload.description !== undefined && {
        description: payload.description,
      }),
      ...dateData,
    },
    select: EXPERIENCE_SELECT,
  });

  return mapExperience(experience);
};

const remove = async (userId: string, id: string) => {
  const result = await prisma.experience.deleteMany({
    where: {
      id,
      userId,
    },
  });

  if (result.count === 0) {
    throw new AppError(status.NOT_FOUND, "Experience not found");
  }

  return null;
};

export const ExperienceService = {
  create,
  getOwn,
  getPublic,
  update,
  delete: remove,
};
