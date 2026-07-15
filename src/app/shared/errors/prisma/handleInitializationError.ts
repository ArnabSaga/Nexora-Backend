import status from 'http-status';
import { Prisma } from '../../../../generated/prisma/client';
import { TErrorSources } from '../../types/error.types';
import {
  buildPrismaErrorResponse,
  getMainMessage,
  getStatusCodeFromPrismaError,
} from './prismaErrorUtils';

export const handlePrismaClientInitializationError = (
  error: Prisma.PrismaClientInitializationError
) => {
  const statusCode = error.errorCode
    ? getStatusCodeFromPrismaError(error.errorCode)
    : status.SERVICE_UNAVAILABLE;
  const mainMessage = getMainMessage(
    error.message,
    'An error occurred while initializing the Prisma Client.'
  );

  const errorMessages: TErrorSources = [
    {
      path: error.errorCode || 'initialization',
      message: mainMessage,
    },
  ];

  return buildPrismaErrorResponse(statusCode, mainMessage, errorMessages);
};
