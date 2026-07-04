import { Prisma } from '../../../../generated/prisma/client';
import {
  buildPrismaErrorResponse,
  formatErrorMeta,
  getMainMessage,
  getStatusCodeFromPrismaError,
} from './prismaErrorUtils';
import { TErrorSources } from '../../types/error.types';

export const handlePrismaClientKnownRequestError = (
  error: Prisma.PrismaClientKnownRequestError
) => {
  const statusCode = getStatusCodeFromPrismaError(error.code);
  const mainMessage = getMainMessage(
    error.message,
    'An error occurred with the database operation.'
  );
  const metaInfo = formatErrorMeta(error.meta as Record<string, unknown> | undefined);

  const errorMessages: TErrorSources = [
    {
      path: error.code,
      message: metaInfo ? `${mainMessage} | ${metaInfo}` : mainMessage,
    },
  ];

  if (error.meta?.cause) {
    errorMessages.push({
      path: 'cause',
      message: String(error.meta.cause),
    });
  }

  return buildPrismaErrorResponse(statusCode, mainMessage, errorMessages);
};
