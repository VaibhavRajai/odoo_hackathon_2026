import mailer from "../../config/mailer.js";
import { logger, LOG_EVENTS } from "../../utils/logger.js";

/**
 * Sends the license-renewal reminder email. Failures are logged, never
 * thrown — a flaky SMTP send must not block driver create/update/validate.
 *
 * @param {{ id: string, name: string, email: string, licenseNumber: string, licenseExpiry: Date }} driver
 * @param {boolean} isExpired
 */
export async function sendLicenseRenewalEmail(driver, isExpired) {
  const expiryDate = new Date(driver.licenseExpiry).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM,
      to: driver.email,
      subject: isExpired
        ? "TransitOps — Your Driving License Has Expired"
        : "TransitOps — License Renewal Reminder",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="margin: 0 0 8px; color: #111827;">${isExpired ? "License Expired" : "License Expiring Soon"}</h2>
          <p style="color: #6b7280; margin: 0 0 24px;">Hi ${driver.name}, your license <strong>${driver.licenseNumber}</strong> ${isExpired ? "expired on" : "expires on"} <strong>${expiryDate}</strong>.</p>
          <p style="color: #6b7280; margin: 0 0 24px;">Please renew it as soon as possible to remain eligible for trip assignment.</p>
        </div>
      `,
    });
    logger.info(LOG_EVENTS.LICENSE_RENEWAL_EMAIL_SENT, { driverId: driver.id, email: driver.email });
  } catch (error) {
    logger.error(LOG_EVENTS.LICENSE_RENEWAL_EMAIL_FAILED, { driverId: driver.id, email: driver.email, reason: error.message });
  }
}
