import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redis from "../config/redis.js";
import {
  LOGIN_RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_WINDOW_MS,
  FORGOT_PASSWORD_RATE_LIMIT_MAX,
  FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS,
  VERIFY_OTP_RATE_LIMIT_MAX,
  VERIFY_OTP_RATE_LIMIT_WINDOW_MS,
  RESET_PASSWORD_RATE_LIMIT_MAX,
  RESET_PASSWORD_RATE_LIMIT_WINDOW_MS,
} from "../constants/auth.constants.js";

/**
 * Creates a Redis-backed sliding window rate limiter.
 * Uses sorted sets — more accurate than fixed-window across restarts and multiple instances.
 *
 * @param {string} prefix - Unique Redis key prefix for this limiter.
 */
function createLimiter(prefix, max, windowMs, message) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix,
    }),
    message: { success: false, message },
  });
}

export const loginRateLimiter = createLimiter(
  "rl:login:",
  LOGIN_RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_WINDOW_MS,
  "Too many login attempts from this IP. Please try again after 15 minutes."
);

export const forgotPasswordRateLimiter = createLimiter(
  "rl:forgot-password:",
  FORGOT_PASSWORD_RATE_LIMIT_MAX,
  FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS,
  "Too many OTP requests from this IP. Please try again after 15 minutes."
);

export const verifyOtpRateLimiter = createLimiter(
  "rl:verify-otp:",
  VERIFY_OTP_RATE_LIMIT_MAX,
  VERIFY_OTP_RATE_LIMIT_WINDOW_MS,
  "Too many OTP verification attempts from this IP. Please try again after 15 minutes."
);

export const resetPasswordRateLimiter = createLimiter(
  "rl:reset-password:",
  RESET_PASSWORD_RATE_LIMIT_MAX,
  RESET_PASSWORD_RATE_LIMIT_WINDOW_MS,
  "Too many password reset attempts from this IP. Please try again after 15 minutes."
);
