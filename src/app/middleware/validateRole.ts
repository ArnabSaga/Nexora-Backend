import { NextFunction, Request, RequestHandler, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import status from "http-status";
import { UserRole, UserStatus } from "../../generated/prisma/client";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import AppError from "../shared/errors/AppError";

export type TAllowedRole = UserRole;

export const requireAuth: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user?.id) {
      throw new AppError(status.UNAUTHORIZED, "You are not authenticated");
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!user) {
      throw new AppError(status.UNAUTHORIZED, "You are not authenticated");
    }

    if (user.status !== UserStatus.ACTIVE || user.deletedAt) {
      throw new AppError(status.FORBIDDEN, "This account is not active");
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const validateRole =
  (...allowedRoles: TAllowedRole[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(status.UNAUTHORIZED, "You are not authenticated");
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AppError(
          status.FORBIDDEN,
          "You are not allowed to access this resource",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };

//NOTE: Optional alias if  roleMiddleware somewhere else
export const roleMiddleware = validateRole;
