export type TExperienceResponse = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TCreateExperiencePayload = {
  title: string;
  company: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string | null;
};

export type TUpdateExperiencePayload = Partial<TCreateExperiencePayload>;
