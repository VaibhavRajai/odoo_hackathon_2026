import bcrypt from "bcryptjs";
import { getAllUsers, findUserByEmail, findUserById, updatePassword } from "./auth.repository.js";
import { createSession, deleteSession, invalidateUserSessions } from "./redis/session.service.js";
import { isAccountLocked, recordFailedAttempt, clearFailedAttempts } from "./redis/loginSecurity.service.js";
import { generateOTP, verifyOTP, resendOTP } from "./redis/otp.service.js";
import { logger, LOG_EVENTS } from "../../utils/logger.js";
import { ROLE_DASHBOARD } from "../../constants/auth.constants.js";

/**
 * AuthService — all authentication business logic.
 * Controllers are kept thin by delegating here.
 */

/**
 * Returns the list of all user accounts for the Forgot Password dropdown.
 * Only exposes id, name, email, and role — no sensitive data.
 *
 * @returns {Promise<Array<{ id: string, name: string, email: string, role: string }>>}
 */
export async function getAccounts() {
  const users = await getAllUsers();
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role.name,
  }));
}

/**
 * Authenticates a user and creates a Redis session.
 * Returns the session ID and the user's role-specific dashboard path.
 *
 * @param {{ email: string, password: string }} params
 * @returns {Promise<{ sessionId: string, user: object, dashboardPath: string }>}
 */
export async function login({ email, password }) {
  // 1. Check account lock first
  const lock = await isAccountLocked(email);
  if (lock.locked) {
    throw Object.assign(
      new Error("Too many failed login attempts. Your account has been temporarily locked for 15 minutes."),
      { status: 429 }
    );
  }

  // 2. Find user (generic error prevents email enumeration)
  const user = await findUserByEmail(email);
  if (!user) {
    await recordFailedAttempt(email);
    throw Object.assign(new Error("Invalid email or password."), { status: 401 });
  }

  // 3. Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    const result = await recordFailedAttempt(email);
    if (result.locked) {
      throw Object.assign(
        new Error("Too many failed login attempts. Your account has been temporarily locked for 15 minutes."),
        { status: 429 }
      );
    }
    throw Object.assign(new Error("Invalid email or password."), { status: 401 });
  }

  // 4. Success — clear attempts, create session
  await clearFailedAttempts(email);

  const roleName = user.role.name;
  const dashboardPath = ROLE_DASHBOARD[roleName] ?? "/dashboard";

  const sessionId = await createSession(user.id, {
    email: user.email,
    name: user.name,
    role: roleName,
    dashboardPath,
  });

  logger.info(LOG_EVENTS.LOGIN_SUCCESS, { userId: user.id, email: user.email, role: roleName });

  return {
    sessionId,
    user: { id: user.id, email: user.email, name: user.name, role: roleName },
    dashboardPath,
  };
}

/**
 * Logs out a user by deleting their session from Redis.
 *
 * @param {string} sessionId
 */
export async function logout(sessionId) {
  await deleteSession(sessionId);
  logger.info(LOG_EVENTS.LOGOUT, { sessionId });
}

/**
 * Initiates the forgot-password flow for a selected account.
 * Generates an OTP and sends it to the user's email.
 * Always returns the same response — never reveals whether the email exists.
 *
 * @param {string} email
 */
export async function forgotPassword(email) {
  const user = await findUserByEmail(email);
  if (!user) return; // Silent — caller gets generic response
  await generateOTP(user.id, user.email, user.name);
}

/**
 * Verifies the OTP entered by the user.
 *
 * @param {string} userId
 * @param {string} otp
 * @returns {Promise<{ valid: boolean, reason?: string }>}
 */
export async function verifyUserOTP(userId, otp) {
  return verifyOTP(userId, otp);
}

/**
 * Resends a new OTP to the user's email.
 *
 * @param {string} email
 */
export async function resendUserOTP(email) {
  const user = await findUserByEmail(email);
  if (!user) return;
  await resendOTP(user.id, user.email, user.name);
}

/**
 * Resets the user's password and invalidates all their active sessions.
 *
 * @param {string} userId
 * @param {string} newPassword
 */
export async function resetPassword(userId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await updatePassword(userId, passwordHash);
  await invalidateUserSessions(userId);
  logger.info(LOG_EVENTS.PASSWORD_RESET, { userId });
}
