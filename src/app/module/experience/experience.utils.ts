import { serializeDateOnly } from "../../shared/helpers/dateOnly";
import { TExperienceResponse } from "./experience.interface";

type TExperiencePayload = {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  startDate: Date;
  endDate?: Date | null;
  isCurrent: boolean;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const mapExperience = (
  experience: TExperiencePayload,
): TExperienceResponse => ({
  id: experience.id,
  title: experience.title,
  company: experience.company,
  location: experience.location ?? null,
  startDate: serializeDateOnly(experience.startDate)!,
  endDate: serializeDateOnly(experience.endDate),
  isCurrent: experience.isCurrent,
  description: experience.description ?? null,
  createdAt: experience.createdAt,
  updatedAt: experience.updatedAt,
});
