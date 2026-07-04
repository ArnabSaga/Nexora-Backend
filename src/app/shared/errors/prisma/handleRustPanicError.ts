import status from 'http-status';
import { TErrorSources } from '../../types/error.types';
import { buildPrismaErrorResponse } from './prismaErrorUtils';

export const handlePrismaClientRustPanicError = () => {
  const message = 'The database engine encountered a fatal error.';
  const errorMessages: TErrorSources = [
    {
      path: 'rust-engine',
      message,
    },
  ];

  return buildPrismaErrorResponse(status.INTERNAL_SERVER_ERROR, message, errorMessages);
};
