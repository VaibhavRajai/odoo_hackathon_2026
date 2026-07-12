/**
 * Central constants for the Authentication module.
 * All tuneable security parameters live here — never hardcode these in services.
 */

/** Maximum consecutive failed login attempts before account is locked. */
export const LOGIN_MAX_ATTEMPTS = 5;

/** Duration (in minutes) an account remains locked after exceeding LOGIN_MAX_ATTEMPTS. */
export const ACCOUNT_LOCK_DURATION_MINUTES = 15;

/** OTP validity window in seconds (10 minutes). */
export const OTP_EXPIRY_SECONDS = 10 * 60;

/** Maximum OTP verification attempts before the OTP is invalidated. */
export const OTP_MAX_ATTEMPTS = 5;

/** IP-level rate limit: max login requests per window. */
export const LOGIN_RATE_LIMIT_MAX = 10;

/** IP-level rate limit: window duration in ms for login (15 minutes). */
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** IP-level rate limit: max forgot-password OTP requests per window. */
export const OTP_RATE_LIMIT_MAX = 3;

/** IP-level rate limit: window duration in ms for OTP requests (15 minutes). */
export const OTP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** IP-level rate limit: max reset-password requests per window. */
export const RESET_RATE_LIMIT_MAX = 5;

/** IP-level rate limit: window duration in ms for reset-password (15 minutes). */
export const RESET_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** IP-level rate limit: max OTP verify attempts per window. */
export const VERIFY_OTP_RATE_LIMIT_MAX = 5;

/** IP-level rate limit: window duration in ms for verify-otp (15 minutes). */
export const VERIFY_OTP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Session TTL in seconds (5 days). */
export const SESSION_TTL_SECONDS = 5 * 24 * 60 * 60;

/** Redis key prefix for login attempt tracking. */
export const REDIS_KEY_LOGIN_ATTEMPTS = (email) => `login_attempts:${email}`;

/** Redis key prefix for session storage. */
export const REDIS_KEY_SESSION = (sessionId) => `session:${sessionId}`;

/** Redis key prefix for OTP storage. */
export const REDIS_KEY_OTP = (userId) => `otp:${userId}`;

/** HTTP-Only session cookie name. */
export const SESSION_COOKIE_NAME = "sid";
