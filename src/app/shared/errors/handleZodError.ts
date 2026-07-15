import status from 'http-status';
import { ZodError } from 'zod';
import { TErrorResponse, TErrorSources } from '../types/error.types';

export const handleZodError = (err: ZodError): TErrorResponse => {
  const statusCode = status.BAD_REQUEST;
  const message = 'Validation Error';
  const errorMessages: TErrorSources = [];

  err.issues.forEach((issue) => {
    errorMessages.push({
      path: issue.path.join('.'),
      message: issue.message,
    });
  });

  return {
    success: false,
    message,
    errorMessages,
    statusCode,
  };
};
