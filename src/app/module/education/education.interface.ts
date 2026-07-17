export type TEducationResponse = {
  id: string;
  institution: string;
  degree: string | null;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TCreateEducationPayload = {
  institution: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
};

export type TUpdateEducationPayload = Partial<TCreateEducationPayload>;
