import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";

import { envVars } from "../config/env";
import { prisma } from "./prisma";
import { sendEmail } from "../shared/helpers/emailTemplate";
import { createProfileUsernameCandidate } from "../shared/helpers/username";
import { isUniqueConstraintOn } from "../shared/helpers/prismaUnique";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sendSecurityEmail = async (options: {
  email: string;
  name?: string | null;
  subject: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  code?: string;
  expiryMinutes?: number;
}) => {
  await sendEmail({
    to: options.email,
    subject: options.subject,
    templateName: "otp",
    templateData: {
      name: options.name?.trim() || "there",
      title: options.title,
      message: options.message,
      actionUrl: options.actionUrl,
      actionLabel: options.actionLabel,
      code: options.code,
      expiryMinutes: options.expiryMinutes ?? 10,
      appName: "Nexora",
    },
    text:
      `${options.title}\n\n${options.message}` +
      (options.actionUrl
        ? `\n\n${options.actionLabel || "Continue"}: ${options.actionUrl}`
        : "") +
      (options.code ? `\n\nCode: ${options.code}` : "") +
      `\n\nThis request expires in ${options.expiryMinutes ?? 10} minutes.`,
  });
};

const createInitialProfile = async (user: {
  id: string;
  email: string;
  name: string;
}) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await prisma.profile.create({
        data: {
          username: createProfileUsernameCandidate(user, attempt),
          user: {
            connect: {
              id: user.id,
            },
          },
        },
      });

      return;
    } catch (error) {
      if (isUniqueConstraintOn(error, ["userId"])) {
        return;
      }

      if (isUniqueConstraintOn(error, ["username"])) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Could not create a unique profile username.");
};

export const auth = betterAuth({
  secret: envVars.BETTER_AUTH_SECRET,
  baseURL: envVars.BETTER_AUTH_URL,
  basePath: envVars.BETTER_AUTH_BASE_PATH,
  trustedOrigins: [envVars.FRONTEND_URL, envVars.BETTER_AUTH_URL],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  ...(envVars.OAUTH?.GOOGLE && {
    socialProviders: {
      google: {
        clientId: envVars.OAUTH.GOOGLE.CLIENT_ID,
        clientSecret: envVars.OAUTH.GOOGLE.CLIENT_SECRET,
      },
    },
  }),
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (
        (ctx.path === "/sign-in/email" || ctx.path === "/sign-up/email") &&
        typeof ctx.body?.email === "string"
      ) {
        ctx.body.email = normalizeEmail(ctx.body.email);
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    async sendResetPassword({ user, url }) {
      await sendSecurityEmail({
        email: user.email,
        name: user.name,
        subject: "Reset your Nexora password",
        title: "Reset your password",
        message: "Use the secure link below to reset your Nexora password.",
        actionUrl: url,
        actionLabel: "Reset password",
        expiryMinutes: 60,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 60 * 10,
    async sendVerificationEmail({ user, url }) {
      await sendSecurityEmail({
        email: user.email,
        name: user.name,
        subject: "Verify your Nexora email",
        title: "Verify your email",
        message:
          "Use the secure link below to verify your Nexora email address.",
        actionUrl: url,
        actionLabel: "Verify email",
        expiryMinutes: 10,
      });
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        input: false,
        defaultValue: "USER",
      },
      status: {
        type: "string",
        input: false,
        defaultValue: "ACTIVE",
      },
      lastLoginAt: {
        type: "date",
        input: false,
        required: false,
      },
      deletedAt: {
        type: "date",
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
              role: "USER",
              status: "ACTIVE",
            },
          };
        },
        async after(user) {
          await createInitialProfile({
            id: user.id,
            email: user.email,
            name: user.name,
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

          if (!user || user.status !== "ACTIVE" || user.deletedAt) {
            throw APIError.from("FORBIDDEN", {
              code: "ACCOUNT_NOT_ACTIVE",
              message: "This account is not active.",
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
