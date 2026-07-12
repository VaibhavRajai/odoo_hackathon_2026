import { randomInt } from "crypto";
import redis from "../../../config/redis.js";
import mailer from "../../../config/mailer.js";
import { logger, LOG_EVENTS } from "../../../utils/logger.js";
import { REDIS_KEY_OTP, OTP_EXPIRY_SECONDS, OTP_MAX_ATTEMPTS } from "../../../constants/auth.constants.js";

/**
 * OTPService — plain 6-digit OTP stored in Redis with a 10-minute TTL.
 * No hashing — kept simple for hackathon. OTP is deleted immediately on success.
 */

/**
 * Generates a 6-digit OTP, stores it in Redis, and sends it via email.
 *
 * @param {string} userId
 * @param {string} email
 * @param {string} name - Recipient's display name for the email.
 */
export async function generateOTP(userId, email, name) {
  const otp = randomInt(100000, 1000000).toString();
  const key = REDIS_KEY_OTP(userId);

  await redis.setex(key, OTP_EXPIRY_SECONDS, JSON.stringify({ otp, attempts: 0 }));

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "TransitOps — Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="margin: 0 0 8px; color: #111827;">Password Reset</h2>
          <p style="color: #6b7280; margin: 0 0 24px;">Hi ${name}, use the code below to reset your TransitOps password.</p>
          <div style="font-size: 40px; font-weight: 700; letter-spacing: 14px; color: #2563eb; padding: 20px; background: #eff6ff; border-radius: 8px; text-align: center;">
            ${otp}
          </div>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
            This code expires in <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });
    logger.info(LOG_EVENTS.OTP_GENERATED, { userId, email });
  } catch (mailError) {
    logger.error("Failed to send OTP email: " + mailError.message);
  }

  // Log OTP to server console to guarantee demoability under poor network / missing SMTP config
  console.log(`\n==================================================`);
  console.log(`[HACKATHON OTP DEBUG - BYPASS SMTP]`);
  console.log(`User ID:  ${userId}`);
  console.log(`Email:    ${email}`);
  console.log(`Name:     ${name}`);
  console.log(`OTP Code: ${otp}`);
  console.log(`==================================================\n`);
}

/**
 * Verifies the OTP entered by the user.
 * Deletes the OTP from Redis immediately on success.
 * Increments the attempt counter on failure.
 *
 * @param {string} userId
 * @param {string} inputOtp
 * @returns {Promise<{ valid: boolean, reason?: string }>}
 */
export async function verifyOTP(userId, inputOtp) {
  const key = REDIS_KEY_OTP(userId);
  const raw = await redis.get(key);

  if (!raw) {
    return { valid: false, reason: "OTP not found or has expired." };
  }

  const data = JSON.parse(raw);

  if (data.attempts >= OTP_MAX_ATTEMPTS) {
    await redis.del(key);
    logger.warn(LOG_EVENTS.OTP_FAILED, { userId, reason: "Max attempts exceeded" });
    return { valid: false, reason: "Too many incorrect attempts. Please request a new OTP." };
  }

  if (inputOtp !== data.otp) {
    data.attempts += 1;
    const ttl = await redis.ttl(key);
    await redis.setex(key, ttl > 0 ? ttl : OTP_EXPIRY_SECONDS, JSON.stringify(data));
    logger.warn(LOG_EVENTS.OTP_FAILED, { userId, attempts: data.attempts });
    return { valid: false, reason: "Invalid OTP." };
  }

  // Correct — delete immediately
  await redis.del(key);
  logger.info(LOG_EVENTS.OTP_VERIFIED, { userId });
  return { valid: true };
}

/**
 * Deletes any existing OTP and sends a fresh one.
 *
 * @param {string} userId
 * @param {string} email
 * @param {string} name
 */
export async function resendOTP(userId, email, name) {
  await redis.del(REDIS_KEY_OTP(userId));
  await generateOTP(userId, email, name);
  logger.info(LOG_EVENTS.OTP_RESENT, { userId, email });
}
