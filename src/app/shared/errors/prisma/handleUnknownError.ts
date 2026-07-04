import status from 'http-status';
import { Prisma } from '../../../../generated/prisma/client';
import { TErrorSources } from '../../types/error.types';
import { buildPrismaErrorResponse, getMainMessage } from './prismaErrorUtils';

export const handlePrismaClientUnknownError = (
  error: Prisma.PrismaClientUnknownRequestError
) => {
  const mainMessage = getMainMessage(
    error.message,
    'An unknown error occurred with the database operation.'
  );

  const errorMessages: TErrorSources = [
    {
      path: 'unknown',
      message: mainMessage,
    },
  ];

  return buildPrismaErrorResponse(status.INTERNAL_SERVER_ERROR, mainMessage, errorMessages);
};
