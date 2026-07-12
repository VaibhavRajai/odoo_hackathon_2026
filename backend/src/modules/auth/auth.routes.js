import { Router } from "express";
import * as AuthController from "./auth.controller.js";
import {
  loginRateLimiter,
  forgotPasswordRateLimiter,
  verifyOtpRateLimiter,
  resetPasswordRateLimiter,
} from "../../middleware/rateLimiter.js";

const router = Router();

/**
 * Wraps async handlers so errors are forwarded to the global error middleware.
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────

/** GET  /api/auth/accounts — Dropdown data for Forgot Password page */
router.get("/accounts", asyncHandler(AuthController.getAccounts));

/** GET  /api/auth/me — Current user from session */
router.get("/me", asyncHandler(AuthController.me));

/** POST /api/auth/login */
router.post("/login", loginRateLimiter, asyncHandler(AuthController.login));

/** POST /api/auth/logout */
router.post("/logout", asyncHandler(AuthController.logout));

/** POST /api/auth/forgot-password */
router.post("/forgot-password", forgotPasswordRateLimiter, asyncHandler(AuthController.forgotPassword));

/** POST /api/auth/resend-otp */
router.post("/resend-otp", forgotPasswordRateLimiter, asyncHandler(AuthController.resendOtp));

/** POST /api/auth/verify-otp */
router.post("/verify-otp", verifyOtpRateLimiter, asyncHandler(AuthController.verifyOtp));

/** POST /api/auth/reset-password */
router.post("/reset-password", resetPasswordRateLimiter, asyncHandler(AuthController.resetPassword));

export default router;
