import { Request, RequestHandler, Response, NextFunction } from 'express';
import status from 'http-status';
import { UserRole } from '../../generated/prisma/client';
import AppError from '../shared/errors/AppError';

export type TAllowedRole = UserRole;

export const validateRole =
  (...allowedRoles: TAllowedRole[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(status.UNAUTHORIZED, 'You are not authenticated');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AppError(
          status.FORBIDDEN,
          'You are not allowed to access this resource'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };

//NOTE: Optional alias if  roleMiddleware somewhere else
export const roleMiddleware = validateRole;
