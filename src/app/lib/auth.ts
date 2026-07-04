import { APIError, betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createAuthMiddleware } from 'better-auth/api';

import { envVars } from '../config/env';
import { prisma } from './prisma';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const normalizeUsernameSeed = (value: string) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .replace(/^[_.]+|[_.]+$/g, '');

  return normalized.length >= 3 ? normalized : 'nexora_user';
};

const createProfileUsername = (user: { id: string; email: string; name: string }) => {
  const emailSeed = user.email.split('@')[0] ?? user.name;
  const suffix = user.id.slice(0, 8).toLowerCase();

  return `${normalizeUsernameSeed(emailSeed)}_${suffix}`;
};

export const auth = betterAuth({
  secret: envVars.BETTER_AUTH_SECRET,
  baseURL: envVars.BETTER_AUTH_URL,
  trustedOrigins: [envVars.FRONTEND_URL, envVars.BETTER_AUTH_URL],
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (
        (ctx.path === '/sign-in/email' || ctx.path === '/sign-up/email') &&
        typeof ctx.body?.email === 'string'
      ) {
        ctx.body.email = normalizeEmail(ctx.body.email);
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        input: false,
        defaultValue: 'USER',
      },
      status: {
        type: 'string',
        input: false,
        defaultValue: 'ACTIVE',
      },
      lastLoginAt: {
        type: 'date',
        input: false,
        required: false,
      },
      deletedAt: {
        type: 'date',
        input: false,
        required: false,
        returned: false,
      },
    },
    deleteUser: {
      enabled: false,
    },
  },
  databaseHooks: {
    user: {
      create: {
        async before(user) {
          return {
            data: {
              ...user,
              email: normalizeEmail(user.email),
              role: 'USER',
              status: 'ACTIVE',
            },
          };
        },
        async after(user) {
          await prisma.profile.upsert({
            where: {
              userId: user.id,
            },
            create: {
              username: createProfileUsername({
                id: user.id,
                email: user.email,
                name: user.name,
              }),
              user: {
                connect: {
                  id: user.id,
                },
              },
            },
            update: {},
          });
        },
      },
    },
    session: {
      create: {
        async before(session) {
          const user = await prisma.user.findUnique({
            where: {
              id: session.userId,
            },
            select: {
              status: true,
              deletedAt: true,
            },
          });

          if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
            throw APIError.from('FORBIDDEN', {
              code: 'ACCOUNT_NOT_ACTIVE',
              message: 'This account is not active.',
            });
          }
        },
        async after(session) {
          await prisma.user.update({
            where: {
              id: session.userId,
            },
            data: {
              lastLoginAt: new Date(),
            },
          });
        },
      },
    },
  },
});
