import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters');

const register = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.email().trim().toLowerCase(),
  password: passwordSchema,
  image: z.url().optional(),
  rememberMe: z.boolean().optional(),
});

const login = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

const verifyEmail = z.object({
  token: z.string().trim().min(1, 'Verification token is required'),
  callbackURL: z.url().optional(),
});

const forgotPassword = z.object({
  email: z.email().trim().toLowerCase(),
  redirectTo: z.url().optional(),
});

const resendVerificationEmail = z.object({
  email: z.email().trim().toLowerCase(),
  callbackURL: z.url().optional(),
});

const googleLogin = z.object({
  callbackURL: z.url().optional(),
  newUserCallbackURL: z.url().optional(),
  errorCallbackURL: z.url().optional(),
});

const resetPassword = z.object({
  token: z.string().trim().min(1, 'Password reset token is required'),
  newPassword: passwordSchema,
});

const changePassword = z
  .object({
    oldPassword: z.string().min(1).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: passwordSchema,
    revokeOtherSessions: z.boolean().optional(),
  })
  .refine((data) => data.oldPassword || data.currentPassword, {
    path: ['oldPassword'],
    message: 'Current password is required',
  });

export const AuthValidation = {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resendVerificationEmail,
  googleLogin,
  resetPassword,
  changePassword,
};
