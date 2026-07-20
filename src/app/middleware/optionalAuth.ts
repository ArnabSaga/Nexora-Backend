import { fromNodeHeaders } from "better-auth/node";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { UserStatus } from "../../generated/prisma/client";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

export const optionalAuth: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user?.id) {
      next();
      return;
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

    if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
      next();
      return;
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
  } catch {
    next();
  }
};
