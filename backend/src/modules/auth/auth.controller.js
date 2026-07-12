import * as AuthService from "./auth.service.js";
import { getSession } from "./redis/session.service.js";
import { SESSION_COOKIE_NAME } from "../../constants/auth.constants.js";

/**
 * AuthController — thin request/response handlers.
 * All business logic is in AuthService.
 */

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 5 * 24 * 60 * 60 * 1000, // 5 days
};

/**
 * GET /api/auth/accounts
 * Returns the list of TransitOps accounts for the Forgot Password dropdown.
 */
export async function getAccounts(_req, res) {
  const accounts = await AuthService.getAccounts();
  return res.status(200).json({ success: true, data: accounts });
}

/**
 * POST /api/auth/login
 */
export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  const { sessionId, user, dashboardPath } = await AuthService.login({ email, password });

  res.cookie(SESSION_COOKIE_NAME, sessionId, COOKIE_OPTIONS);

  return res.status(200).json({
    success: true,
    message: "Login successful.",
    data: { user, dashboardPath },
  });
}

/**
 * POST /api/auth/logout
 */
export async function logout(req, res) {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  await AuthService.logout(sessionId);
  res.clearCookie(SESSION_COOKIE_NAME);
  return res.status(200).json({ success: true, message: "Logged out successfully." });
}

/**
 * GET /api/auth/me
 * Returns the authenticated user from the session cookie.
 */
export async function me(req, res) {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  if (!sessionId) {
    return res.status(401).json({ success: false, message: "Not authenticated." });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return res.status(401).json({ success: false, message: "Session expired or invalid." });
  }

  return res.status(200).json({
    success: true,
    data: {
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      dashboardPath: session.dashboardPath,
    },
  });
}

/**
 * POST /api/auth/forgot-password
 * Accepts an email from the searchable dropdown.
 * Always returns the same response to prevent email enumeration.
 */
export async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  await AuthService.forgotPassword(email);

  return res.status(200).json({
    success: true,
    message: "If an account exists for this email, an OTP has been sent.",
  });
}

/**
 * POST /api/auth/verify-otp
 */
export async function verifyOtp(req, res) {
  const { userId, otp } = req.body;

  if (!userId || !otp) {
    return res.status(400).json({ success: false, message: "userId and otp are required." });
  }

  const result = await AuthService.verifyUserOTP(userId, otp);

  if (!result.valid) {
    return res.status(400).json({ success: false, message: result.reason });
  }

  return res.status(200).json({ success: true, message: "OTP verified successfully." });
}

/**
 * POST /api/auth/resend-otp
 */
export async function resendOtp(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  await AuthService.resendUserOTP(email);

  return res.status(200).json({
    success: true,
    message: "A new OTP has been sent to your email.",
  });
}

/**
 * POST /api/auth/reset-password
 */
export async function resetPassword(req, res) {
  const { userId, newPassword } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({ success: false, message: "userId and newPassword are required." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
  }

  await AuthService.resetPassword(userId, newPassword);

  return res.status(200).json({
    success: true,
    message: "Password reset successfully. Please log in with your new password.",
  });
}
