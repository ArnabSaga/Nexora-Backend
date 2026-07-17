import { serializeDateOnly } from "../../shared/helpers/dateOnly";
import { TEducationResponse } from "./education.interface";

type TEducationPayload = {
  id: string;
  institution: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const mapEducation = (
  education: TEducationPayload,
): TEducationResponse => ({
  id: education.id,
  institution: education.institution,
  degree: education.degree ?? null,
  fieldOfStudy: education.fieldOfStudy ?? null,
  startDate: serializeDateOnly(education.startDate),
  endDate: serializeDateOnly(education.endDate),
  description: education.description ?? null,
  createdAt: education.createdAt,
  updatedAt: education.updatedAt,
});
