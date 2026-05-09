import nodemailer from "nodemailer";

export function createGmailTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export const gmailConfigured = !!(
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
);
