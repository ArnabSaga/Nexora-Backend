import { ErrorRequestHandler } from 'express';
import status from 'http-status';
import multer from 'multer';
import { ZodError } from 'zod';
import { Prisma } from '../../generated/prisma/client';
import { envVars } from '../config/env';
import { UPLOAD_MAX_FILE_SIZE_MB } from '../module/upload/upload.constant';
import AppError from '../shared/errors/AppError';
import {
  handlePrismaClientInitializationError,
  handlePrismaClientKnownRequestError,
  handlePrismaClientRustPanicError,
  handlePrismaClientUnknownError,
  handlePrismaClientValidationError,
} from '../shared/errors/handlePrismaErrors';
import { handleZodError } from '../shared/errors/handleZodError';
import { TErrorSources } from '../shared/types/error.types';

const globalErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (envVars.IS_DEV) {
    const method = req.method;
    const url = req.originalUrl || req.url;

    if (err instanceof AppError && err.statusCode === status.UNAUTHORIZED) {
      if (!url.includes('/api/v1/auth/me')) {
        console.warn(`[${method} ${url}] 🔓 ${err.message}`);
      }
    } else if (err instanceof ZodError) {
      console.error(`[${method} ${url}] [Zod Validation Error]:`, err.issues);
    } else if (err instanceof SyntaxError && 'body' in err) {
      console.error(`[${method} ${url}] [Syntax Error in Request Body]:`, err.message);
    } else {
      console.error(`[${method} ${url}] Error:`, err);
    }
  }

  let statusCode: number = status.INTERNAL_SERVER_ERROR;
  let message = 'Something went wrong!';
  let errorMessages: TErrorSources = [
    {
      path: '',
      message: 'Something went wrong!',
    },
  ];

  if (err instanceof ZodError) {
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError.statusCode ?? status.BAD_REQUEST;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const simplifiedError = handlePrismaClientKnownRequestError(err);
    statusCode = simplifiedError.statusCode ?? status.BAD_REQUEST;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    const simplifiedError = handlePrismaClientValidationError(err);
    statusCode = simplifiedError.statusCode ?? status.BAD_REQUEST;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    const simplifiedError = handlePrismaClientUnknownError(err);
    statusCode = simplifiedError.statusCode ?? status.INTERNAL_SERVER_ERROR;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    const simplifiedError = handlePrismaClientInitializationError(err);
    statusCode = simplifiedError.statusCode ?? status.INTERNAL_SERVER_ERROR;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } else if (err instanceof Prisma.PrismaClientRustPanicError) {
    const simplifiedError = handlePrismaClientRustPanicError();
    statusCode = simplifiedError.statusCode ?? status.INTERNAL_SERVER_ERROR;
    message = simplifiedError.message;
    errorMessages = [
      {
        path: 'rust-engine',
        message: envVars.IS_DEV ? err.message : simplifiedError.message,
      },
    ];
  } else if (err instanceof multer.MulterError) {
    statusCode = status.BAD_REQUEST;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File size must not exceed ${UPLOAD_MAX_FILE_SIZE_MB}MB`
        : err.message;
    errorMessages = [
      {
        path: '',
        message: message,
      },
    ];
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorMessages = [
      {
        path: '',
        message: err.message,
      },
    ];
  } else if (err instanceof Error) {
    message = envVars.IS_DEV ? err.message : message;
    errorMessages = [
      {
        path: '',
        message,
      },
    ];
  }

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errorMessages,
    error: envVars.IS_DEV ? err : undefined,
    stack: envVars.IS_DEV ? err?.stack : undefined,
  });
};

export default globalErrorHandler;
