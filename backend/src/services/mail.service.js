const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (!env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

/** Sends an email via SMTP, or logs it when SMTP is not configured (dev / demo). */
async function sendMail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) {
    logger.info(`[email:dev] to=${to} subject="${subject}"`);
    return { logged: true };
  }
  return t.sendMail({ from: env.smtp.from, to, subject, text });
}

module.exports = { sendMail };
