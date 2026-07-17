export type TProfileCounts = {
  followersCount: number;
  followingCount: number;
  postsCount: number;
};

export type TProfileUserSummary = {
  id: string;
  name: string;
  avatar: string | null;
  createdAt: Date;
  email?: string;
  emailVerified?: boolean;
};

export type TProfileInfo = {
  id: string;
  username: string;
  bio: string | null;
  headline: string | null;
  coverPhoto: string | null;
  location: string | null;
  website: string | null;
  profession: string | null;
  company: string | null;
  createdAt: Date;
  updatedAt: Date;
};

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

export type TSkillResponse = {
  id: string;
  skillId: string;
  name: string;
  createdAt: Date;
};

export type TProfileResponse = {
  user: TProfileUserSummary;
  profile: TProfileInfo;
  counts: TProfileCounts;
  experience: TExperienceResponse[];
  education: TEducationResponse[];
  skills: TSkillResponse[];
};

export type TUpdateProfilePayload = {
  username?: string;
  bio?: string | null;
  headline?: string | null;
  location?: string | null;
  website?: string | null;
  profession?: string | null;
  company?: string | null;
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

export type TCreateEducationPayload = {
  institution: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
};

export type TUpdateEducationPayload = Partial<TCreateEducationPayload>;

export type TCreateSkillPayload = {
  name: string;
};
