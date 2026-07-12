import nodemailer from "nodemailer";

/**
 * Nodemailer transporter using Gmail SMTP.
 * Credentials are loaded from environment variables EMAIL and PASSWORD.
 */
const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

export default mailer;
