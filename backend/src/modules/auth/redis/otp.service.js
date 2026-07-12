import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import redis from "../../../config/redis.js";
import mailer from "../../../config/mailer.js";
import { logger, LOG_EVENTS } from "../../../utils/logger.js";
import {
  REDIS_KEY_OTP,
  OTP_EXPIRY_SECONDS,
  OTP_MAX_ATTEMPTS,
} from "../../../constants/auth.constants.js";

const BCRYPT_ROUNDS = 10;

/**
 * OTPService — generates, verifies, and manages OTP lifecycle in Redis.
 * OTPs are never stored in plain text — only bcrypt hashes are persisted.
 */

/**
 * Generates a cryptographically secure 6-digit OTP, hashes it, stores it in Redis,
 * and delivers it to the user via email.
 *
 * @param {string} userId - The user's database ID (used as Redis key).
 * @param {string} email - The email address to deliver the OTP to.
 * @returns {Promise<void>}
 */
export async function generateOTP(userId, email) {
  // Cryptographically secure 6-digit OTP (100000–999999)
  const otp = randomInt(100000, 1000000).toString();
  const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
  const expiresAt = Date.now() + OTP_EXPIRY_SECONDS * 1000;

  const key = REDIS_KEY_OTP(userId);
  const payload = JSON.stringify({ otpHash, attempts: 0, expiresAt });

  await redis.setex(key, OTP_EXPIRY_SECONDS, payload);

  await mailer.sendMail({
    from: `"Security" <${process.env.EMAIL}>`,
    to: email,
    subject: "Your Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color: #1a1a1a;">Password Reset Request</h2>
        <p style="color: #555;">Use the OTP below to reset your password. It is valid for <strong>10 minutes</strong>.</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #2563eb; padding: 20px 0;">
          ${otp}
        </div>
        <p style="color: #999; font-size: 13px;">If you did not request a password reset, please ignore this email.</p>
      </div>
    `,
  });

  logger.info(LOG_EVENTS.OTP_GENERATED, { userId, email });
}

/**
 * Verifies a user-supplied OTP against the stored hash.
 * Increments the attempt counter on failure and deletes the OTP on success.
 *
 * @param {string} userId - The user's database ID.
 * @param {string} inputOtp - The raw OTP entered by the user.
 * @returns {Promise<{ valid: boolean, reason?: string }>}
 */
export async function verifyOTP(userId, inputOtp) {
  const key = REDIS_KEY_OTP(userId);
  const raw = await redis.get(key);

  if (!raw) {
    return { valid: false, reason: "OTP not found or has expired." };
  }

  const data = JSON.parse(raw);

  // Check expiry
  if (Date.now() > data.expiresAt) {
    await redis.del(key);
    return { valid: false, reason: "OTP has expired." };
  }

  // Check max attempts
  if (data.attempts >= OTP_MAX_ATTEMPTS) {
    await redis.del(key);
    logger.warn(LOG_EVENTS.OTP_FAILED, { userId, reason: "Max attempts exceeded" });
    return { valid: false, reason: "Maximum OTP attempts exceeded. Please request a new OTP." };
  }

  const isMatch = await bcrypt.compare(inputOtp, data.otpHash);

  if (!isMatch) {
    data.attempts += 1;
    const ttl = await redis.ttl(key);
    await redis.setex(key, ttl > 0 ? ttl : OTP_EXPIRY_SECONDS, JSON.stringify(data));
    logger.warn(LOG_EVENTS.OTP_FAILED, {
      userId,
      attempts: data.attempts,
      attemptsRemaining: OTP_MAX_ATTEMPTS - data.attempts,
    });
    return { valid: false, reason: "Invalid OTP." };
  }

  // Success — delete OTP immediately
  await redis.del(key);
  logger.info(LOG_EVENTS.OTP_VERIFIED, { userId });
  return { valid: true };
}

/**
 * Deletes the existing OTP and issues a fresh one (resend flow).
 *
 * @param {string} userId
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function resendOTP(userId, email) {
  await deleteOTP(userId);
  await generateOTP(userId, email);
  logger.info(LOG_EVENTS.OTP_RESENT, { userId, email });
}

/**
 * Deletes the OTP for a given user from Redis.
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deleteOTP(userId) {
  const key = REDIS_KEY_OTP(userId);
  await redis.del(key);
}
