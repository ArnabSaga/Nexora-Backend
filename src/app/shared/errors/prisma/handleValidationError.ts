import status from 'http-status';
import { Prisma } from '../../../../generated/prisma/client';
import { TErrorSources } from '../../types/error.types';
import { buildPrismaErrorResponse, cleanPrismaMessage } from './prismaErrorUtils';

export const handlePrismaClientValidationError = (
  error: Prisma.PrismaClientValidationError
) => {
  const cleanMessage = cleanPrismaMessage(error.message);
  const lines = cleanMessage
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const fieldMatch = cleanMessage.match(/Argument `([^`]+)`/i);
  const fieldName = fieldMatch ? fieldMatch[1] : 'query';
  const mainMessage =
    lines.find((line) => !line.includes('Argument') && !line.includes('->') && line.length > 10) ||
    lines[0] ||
    'Invalid query parameters provided to the database operation.';

  const errorMessages: TErrorSources = [
    {
      path: fieldName,
      message: mainMessage,
    },
  ];

  return buildPrismaErrorResponse(status.BAD_REQUEST, mainMessage, errorMessages);
};
