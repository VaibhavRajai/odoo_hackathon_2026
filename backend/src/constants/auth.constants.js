/**
 * TransitOps Auth Constants
 * Single source of truth for all tuneable auth parameters.
 */

// ─── Account Lock ─────────────────────────────────────────────────────────────
/** Max consecutive failed login attempts before account is locked. */
export const LOGIN_MAX_ATTEMPTS = 5;

/** Account lock duration in minutes. */
export const ACCOUNT_LOCK_DURATION_MINUTES = 15;

// ─── OTP ─────────────────────────────────────────────────────────────────────
/** OTP validity in seconds (10 minutes). */
export const OTP_EXPIRY_SECONDS = 10 * 60;

/** Max incorrect OTP attempts before the OTP is invalidated. */
export const OTP_MAX_ATTEMPTS = 5;

// ─── Session ─────────────────────────────────────────────────────────────────
/** Session TTL in seconds (5 days). */
export const SESSION_TTL_SECONDS = 5 * 24 * 60 * 60;

/** Cookie name for the session ID. */
export const SESSION_COOKIE_NAME = "sid";

// ─── Rate Limits ─────────────────────────────────────────────────────────────
export const LOGIN_RATE_LIMIT_MAX = 10;
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const FORGOT_PASSWORD_RATE_LIMIT_MAX = 3;
export const FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const VERIFY_OTP_RATE_LIMIT_MAX = 5;
export const VERIFY_OTP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const RESET_PASSWORD_RATE_LIMIT_MAX = 5;
export const RESET_PASSWORD_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

// ─── Redis Key Factories ──────────────────────────────────────────────────────
export const REDIS_KEY_LOGIN_ATTEMPTS = (email) => `login_attempts:${email}`;
export const REDIS_KEY_SESSION = (sessionId) => `session:${sessionId}`;
export const REDIS_KEY_OTP = (userId) => `otp:${userId}`;

// ─── Role → Dashboard Path Mapping ───────────────────────────────────────────
/**
 * Maps a role name to the frontend dashboard route.
 * After login, the client redirects to this path.
 */
export const ROLE_DASHBOARD = {
  "Fleet Manager": "/dashboard/fleet-manager",
  "Driver": "/dashboard/driver",
  "Safety Officer": "/dashboard/safety-officer",
  "Financial Analyst": "/dashboard/financial-analyst",
};
