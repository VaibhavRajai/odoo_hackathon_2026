/**
 * Structured logger for the Authentication module.
 *
 * Usage:
 *   logger.info("LOGIN_SUCCESS", { userId, email });
 *   logger.warn("ACCOUNT_LOCKED", { email, lockedUntil });
 *   logger.error("LOGIN_FAILED", { email, reason });
 */

const LOG_EVENTS = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  PASSWORD_RESET: "PASSWORD_RESET",
  OTP_GENERATED: "OTP_GENERATED",
  OTP_VERIFIED: "OTP_VERIFIED",
  OTP_FAILED: "OTP_FAILED",
  OTP_RESENT: "OTP_RESENT",
  LOGOUT: "LOGOUT",
  REGISTER: "REGISTER",
  LICENSE_RENEWAL_EMAIL_SENT: "LICENSE_RENEWAL_EMAIL_SENT",
  LICENSE_RENEWAL_EMAIL_FAILED: "LICENSE_RENEWAL_EMAIL_FAILED",
};

/**
 * Formats a structured log entry.
 * @param {"INFO"|"WARN"|"ERROR"} level
 * @param {string} event - One of LOG_EVENTS
 * @param {Record<string, any>} meta - Contextual data (userId, email, etc.)
 */
function formatLog(level, event, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...meta,
  });
}

const logger = {
  /**
   * Log an informational security event.
   * @param {string} event
   * @param {Record<string, any>} [meta]
   */
  info(event, meta = {}) {
    console.info(formatLog("INFO", event, meta));
  },

  /**
   * Log a warning security event.
   * @param {string} event
   * @param {Record<string, any>} [meta]
   */
  warn(event, meta = {}) {
    console.warn(formatLog("WARN", event, meta));
  },

  /**
   * Log an error security event.
   * @param {string} event
   * @param {Record<string, any>} [meta]
   */
  error(event, meta = {}) {
    console.error(formatLog("ERROR", event, meta));
  },
};

export { logger, LOG_EVENTS };
