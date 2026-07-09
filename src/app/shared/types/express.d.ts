import type { UserRole, UserStatus } from '../../../generated/prisma/client';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      role: UserRole;
      status: UserStatus;
    }

    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
