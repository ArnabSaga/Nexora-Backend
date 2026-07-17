import {
  TEducationResponse,
  TExperienceResponse,
  TProfileResponse,
  TSkillResponse,
} from "./profile.interface";
import { serializeDateOnly } from "../../shared/helpers/dateOnly";

type TCountPayload = {
  followers?: number;
  following?: number;
};

type TProfilePayload = {
  id: string;
  username: string;
  bio?: string | null;
  headline?: string | null;
  avatar?: string | null;
  coverPhoto?: string | null;
  location?: string | null;
  website?: string | null;
  profession?: string | null;
  company?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type TUserPayload = {
  id: string;
  name: string;
  email?: string;
  emailVerified?: boolean;
  image?: string | null;
  createdAt: Date;
  profile?: TProfilePayload | null;
  _count?: TCountPayload;
};

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

type TUserSkillPayload = {
  id: string;
  skillId: string;
  createdAt: Date;
  skill: {
    id: string;
    name: string;
  };
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

export const mapSkill = (userSkill: TUserSkillPayload): TSkillResponse => ({
  id: userSkill.id,
  skillId: userSkill.skillId,
  name: userSkill.skill.name,
  createdAt: userSkill.createdAt,
});

const mapProfileBase = (options: {
  user: TUserPayload;
  postsCount: number;
  experience: TExperiencePayload[];
  education: TEducationPayload[];
  skills: TUserSkillPayload[];
  includePrivateUserFields: boolean;
}): TProfileResponse => {
  const { user, postsCount, includePrivateUserFields } = options;
  const profile = user.profile;

  if (!profile) {
    throw new Error("Profile payload is required");
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      ...(includePrivateUserFields && {
        email: user.email,
        emailVerified: user.emailVerified,
      }),
      avatar: profile.avatar ?? user.image ?? null,
      createdAt: user.createdAt,
    },
    profile: {
      id: profile.id,
      username: profile.username,
      bio: profile.bio ?? null,
      headline: profile.headline ?? null,
      coverPhoto: profile.coverPhoto ?? null,
      location: profile.location ?? null,
      website: profile.website ?? null,
      profession: profile.profession ?? null,
      company: profile.company ?? null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
    counts: {
      followersCount: user._count?.followers ?? 0,
      followingCount: user._count?.following ?? 0,
      postsCount,
    },
    experience: options.experience.map(mapExperience),
    education: options.education.map(mapEducation),
    skills: options.skills.map(mapSkill),
  };
};

export const mapOwnProfile = (options: {
  user: TUserPayload;
  postsCount: number;
  experience: TExperiencePayload[];
  education: TEducationPayload[];
  skills: TUserSkillPayload[];
}) => {
  return mapProfileBase({
    ...options,
    includePrivateUserFields: true,
  });
};

export const mapPublicProfile = (options: {
  user: TUserPayload;
  postsCount: number;
  experience: TExperiencePayload[];
  education: TEducationPayload[];
  skills: TUserSkillPayload[];
}) => {
  return mapProfileBase({
    ...options,
    includePrivateUserFields: false,
  });
};
