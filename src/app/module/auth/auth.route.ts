import { Router } from "express";
import {
  authRateLimit,
  sensitiveAuthRateLimit,
} from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/requireAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = Router();

router.post(
  "/register",
  authRateLimit,
  validateRequest({ body: AuthValidation.register }),
  AuthController.register,
);

router.post(
  "/login",
  authRateLimit,
  validateRequest({ body: AuthValidation.login }),
  AuthController.login,
);

router.post("/logout", requireAuth, AuthController.logout);

router.get("/me", requireAuth, AuthController.getMe);

router.post(
  "/verify-email",
  validateRequest({ body: AuthValidation.verifyEmail }),
  AuthController.verifyEmail,
);

router.post(
  "/forgot-password",
  sensitiveAuthRateLimit,
  validateRequest({ body: AuthValidation.forgotPassword }),
  AuthController.forgotPassword,
);

router.post(
  "/resend-verification-email",
  sensitiveAuthRateLimit,
  validateRequest({ body: AuthValidation.resendVerificationEmail }),
  AuthController.resendVerificationEmail,
);

router.post(
  "/reset-password",
  sensitiveAuthRateLimit,
  validateRequest({ body: AuthValidation.resetPassword }),
  AuthController.resetPassword,
);

router.post(
  "/google",
  authRateLimit,
  validateRequest({ body: AuthValidation.googleLogin }),
  AuthController.googleLogin,
);

router.get("/google/success", requireAuth, AuthController.googleLoginSuccess);

router.post(
  "/change-password",
  requireAuth,
  validateRequest({ body: AuthValidation.changePassword }),
  AuthController.changePassword,
);

export const AuthRoutes = router;
