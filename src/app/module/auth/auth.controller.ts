import status from "http-status";
import { catchAsync } from "../../shared/helpers/catchAsync";
import { sendResponse } from "../../shared/response/sendResponse";
import { AuthService } from "./auth.service";
import { applyBetterAuthCookies, buildAuthHeaders } from "./auth.utils";

const register = catchAsync(async (req, res) => {
  const result = await AuthService.register(req.body, buildAuthHeaders(req));
  applyBetterAuthCookies(res, result.response.headers);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: "User registered successfully",
    data: result.data,
  });
});

const login = catchAsync(async (req, res) => {
  const result = await AuthService.login(req.body, buildAuthHeaders(req));
  applyBetterAuthCookies(res, result.response.headers);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User logged in successfully",
    data: result.data,
  });
});

const logout = catchAsync(async (req, res) => {
  const result = await AuthService.logout(buildAuthHeaders(req));
  applyBetterAuthCookies(res, result.response.headers);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "User logged out successfully",
    data: null,
  });
});

const getMe = catchAsync(async (req, res) => {
  const user = await AuthService.getMe(req.user!.id);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Current user retrieved successfully",
    data: user,
  });
});

const verifyEmail = catchAsync(async (req, res) => {
  const result = await AuthService.verifyEmail(req.body, buildAuthHeaders(req));

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Email verified successfully",
    data: result.data,
  });
});

const forgotPassword = catchAsync(async (req, res) => {
  const result = await AuthService.forgotPassword(
    req.body,
    buildAuthHeaders(req),
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "If the email exists, reset instructions have been sent.",
    data: {
      status: result.data.status,
    },
  });
});

const resendVerificationEmail = catchAsync(async (req, res) => {
  const result = await AuthService.resendVerificationEmail(
    req.body,
    buildAuthHeaders(req),
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message:
      "If the email exists and is unverified, verification instructions have been sent.",
    data: result.data,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const result = await AuthService.resetPassword(
    req.body,
    buildAuthHeaders(req),
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Password reset successfully",
    data: result.data,
  });
});

const googleLogin = catchAsync(async (req, res) => {
  const result = await AuthService.googleLogin(req.body, buildAuthHeaders(req));
  applyBetterAuthCookies(res, result.response.headers);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Google login URL generated successfully",
    data: result.data,
  });
});

const googleLoginSuccess = catchAsync(async (req, res) => {
  const user = await AuthService.googleLoginSuccess(req.user!.id);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Google login completed successfully",
    data: user,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const result = await AuthService.changePassword(
    req.body,
    buildAuthHeaders(req),
  );
  applyBetterAuthCookies(res, result.response.headers);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.data.message || "Password changed successfully",
    data: {
      success: result.data.success,
    },
  });
});

export const AuthController = {
  register,
  login,
  logout,
  getMe,
  verifyEmail,
  forgotPassword,
  resendVerificationEmail,
  resetPassword,
  changePassword,
  googleLogin,
  googleLoginSuccess,
};
