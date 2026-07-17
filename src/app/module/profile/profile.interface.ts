import type { TProfessionalDetails } from "../professional/professional.interface";

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

export type TProfileResponse = {
  user: TProfileUserSummary;
  profile: TProfileInfo;
  counts: TProfileCounts;
  experience: TProfessionalDetails["experience"];
  education: TProfessionalDetails["education"];
  skills: TProfessionalDetails["skills"];
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
