import { TProfileResponse } from "./profile.interface";
import type { TProfessionalDetails } from "../professional/professional.interface";

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

const mapProfileBase = (options: {
  user: TUserPayload;
  postsCount: number;
  professionalDetails: TProfessionalDetails;
  includePrivateUserFields: boolean;
}): TProfileResponse => {
  const { user, postsCount, professionalDetails, includePrivateUserFields } =
    options;
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
    experience: professionalDetails.experience,
    education: professionalDetails.education,
    skills: professionalDetails.skills,
  };
};

export const mapOwnProfile = (options: {
  user: TUserPayload;
  postsCount: number;
  professionalDetails: TProfessionalDetails;
}) => {
  return mapProfileBase({
    ...options,
    includePrivateUserFields: true,
  });
};

export const mapPublicProfile = (options: {
  user: TUserPayload;
  postsCount: number;
  professionalDetails: TProfessionalDetails;
}) => {
  return mapProfileBase({
    ...options,
    includePrivateUserFields: false,
  });
};
