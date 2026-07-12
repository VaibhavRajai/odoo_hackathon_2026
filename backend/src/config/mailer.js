import nodemailer from "nodemailer";

/**
 * Nodemailer transporter configured from environment variables.
 * Uses Gmail SMTP with an App Password.
 *
 * Required .env variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false, // TLS via STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export default mailer;
