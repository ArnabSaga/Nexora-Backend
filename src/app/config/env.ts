import dotenv from 'dotenv';
import status from 'http-status';
import { CLOUDINARY_FOLDER } from '../shared/constants/upload.constant';
import AppError from '../shared/errors/AppError';

dotenv.config();

interface EnvVars {
  NODE_ENV: string;
  PORT: string;
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  FRONTEND_URL: string;
  CLOUDINARY: {
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
    POST_MEDIA_FOLDER: string;
    PROFILE_AVATAR_FOLDER: string;
    PROFILE_COVER_FOLDER: string;
  };
}

const envVariables = (): EnvVars => {
  const getRequiredEnv = (key: string): string => {
    const value = process.env[key];

    if (!value) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        `Environment variable {${key}} is required but not defined in .env file.`
      );
    }

    return value;
  };

  const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
    'FRONTEND_URL',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];

  requiredEnvVars.forEach((variable) => getRequiredEnv(variable));

  return {
    NODE_ENV: getRequiredEnv('NODE_ENV'),
    PORT: getRequiredEnv('PORT'),
    DATABASE_URL: getRequiredEnv('DATABASE_URL'),
    BETTER_AUTH_SECRET: getRequiredEnv('BETTER_AUTH_SECRET'),
    BETTER_AUTH_URL: getRequiredEnv('BETTER_AUTH_URL'),
    FRONTEND_URL: getRequiredEnv('FRONTEND_URL'),
    CLOUDINARY: {
      CLOUDINARY_CLOUD_NAME: getRequiredEnv('CLOUDINARY_CLOUD_NAME'),
      CLOUDINARY_API_KEY: getRequiredEnv('CLOUDINARY_API_KEY'),
      CLOUDINARY_API_SECRET: getRequiredEnv('CLOUDINARY_API_SECRET'),
      POST_MEDIA_FOLDER: process.env.POST_MEDIA_FOLDER ?? CLOUDINARY_FOLDER.POST_MEDIA,
      PROFILE_AVATAR_FOLDER: process.env.PROFILE_AVATAR_FOLDER ?? CLOUDINARY_FOLDER.PROFILE_AVATAR,
      PROFILE_COVER_FOLDER: process.env.PROFILE_COVER_FOLDER ?? CLOUDINARY_FOLDER.PROFILE_COVER,
    },
  };
};

export const envVars = envVariables();
