import redis from "../../../config/redis.js";
import { logger, LOG_EVENTS } from "../../../utils/logger.js";
import {
  REDIS_KEY_LOGIN_ATTEMPTS,
  LOGIN_MAX_ATTEMPTS,
  ACCOUNT_LOCK_DURATION_MINUTES,
} from "../../../constants/auth.constants.js";

const LOCK_DURATION_MS = ACCOUNT_LOCK_DURATION_MINUTES * 60 * 1000;

/**
 * LoginSecurityService — tracks failed login attempts and manages account locks in Redis.
 * All brute-force protection logic is isolated here.
 */

/**
 * Records a failed login attempt for an email address.
 * Automatically locks the account when LOGIN_MAX_ATTEMPTS is reached.
 *
 * @param {string} email - The email address of the failed login attempt.
 * @returns {Promise<{ failedAttempts: number, locked: boolean, lockedUntil: number|null }>}
 */
export async function recordFailedAttempt(email) {
  const key = REDIS_KEY_LOGIN_ATTEMPTS(email);
  const raw = await redis.get(key);

  let data = raw
    ? JSON.parse(raw)
    : { failedAttempts: 0, firstFailedAttempt: Date.now(), lockedUntil: null };

  data.failedAttempts += 1;

  if (data.failedAttempts >= LOGIN_MAX_ATTEMPTS) {
    data.lockedUntil = Date.now() + LOCK_DURATION_MS;
    await redis.set(key, JSON.stringify(data));
    logger.warn(LOG_EVENTS.ACCOUNT_LOCKED, {
      email,
      failedAttempts: data.failedAttempts,
      lockedUntil: new Date(data.lockedUntil).toISOString(),
    });
    return { failedAttempts: data.failedAttempts, locked: true, lockedUntil: data.lockedUntil };
  }

  await redis.set(key, JSON.stringify(data));
  logger.warn(LOG_EVENTS.LOGIN_FAILED, {
    email,
    failedAttempts: data.failedAttempts,
    attemptsRemaining: LOGIN_MAX_ATTEMPTS - data.failedAttempts,
  });
  return { failedAttempts: data.failedAttempts, locked: false, lockedUntil: null };
}

/**
 * Clears all failed login attempt data for an email (called on successful login).
 *
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function clearFailedAttempts(email) {
  const key = REDIS_KEY_LOGIN_ATTEMPTS(email);
  await redis.del(key);
}

/**
 * Checks whether an account is currently locked.
 *
 * @param {string} email
 * @returns {Promise<{ locked: boolean, lockedUntil: number|null, remainingMs: number }>}
 */
export async function isAccountLocked(email) {
  const key = REDIS_KEY_LOGIN_ATTEMPTS(email);
  const raw = await redis.get(key);

  if (!raw) return { locked: false, lockedUntil: null, remainingMs: 0 };

  const data = JSON.parse(raw);

  if (!data.lockedUntil) return { locked: false, lockedUntil: null, remainingMs: 0 };

  const now = Date.now();
  if (now >= data.lockedUntil) {
    // Lock has naturally expired — clean up
    await redis.del(key);
    return { locked: false, lockedUntil: null, remainingMs: 0 };
  }

  return {
    locked: true,
    lockedUntil: data.lockedUntil,
    remainingMs: data.lockedUntil - now,
  };
}

/**
 * Manually locks an account immediately (e.g., admin action).
 *
 * @param {string} email
 * @returns {Promise<{ lockedUntil: number }>}
 */
export async function lockAccount(email) {
  const key = REDIS_KEY_LOGIN_ATTEMPTS(email);
  const raw = await redis.get(key);
  const data = raw
    ? JSON.parse(raw)
    : { failedAttempts: LOGIN_MAX_ATTEMPTS, firstFailedAttempt: Date.now() };

  data.lockedUntil = Date.now() + LOCK_DURATION_MS;
  await redis.set(key, JSON.stringify(data));

  return { lockedUntil: data.lockedUntil };
}
