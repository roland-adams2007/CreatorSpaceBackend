// services/email/authEmailService.js
const sendMail = require("../../utils/sendMail");
const { VerifyEmailTemplate } = require("./emails/templates/verify-email.html");
const {
  LoginNotificationTemplate,
} = require("./emails/templates/loginNotification.html");
const {
  ForgotPasswordTemplate,
} = require("./emails/templates/forgot-password.html");
const { system } = require("../../config/config.inc");

async function sendVerificationEmail({ to, name, token }) {
  const verificationLink = `${system.APP_URL}/auth/verify-email?token=${token}`;

  const subject = "Verify your FUS email address";
  const html = VerifyEmailTemplate({
    userName: name || "there",
    verificationLink,
  });

  await sendMail(to, subject, html);
}

async function sendVerificationEmailReminder({ to, name, token }) {
  const verificationLink = `${system.APP_URL}/auth/verify-email?token=${token}`;
  const subject = "Action required: Verify your FUS account";

  const html = VerifyEmailTemplate({
    userName: name,
    verificationLink,
  });

  await sendMail(to, subject, html);
}

async function sendLoginNotificationEmail({
  email,
  userName,
  loginTime = new Date().toLocaleString(),
  ipAddress = "Unknown",
  deviceInfo = "Web browser",
  location = "Unknown",
}) {
  const subject = "New sign-in to your FUS account";

  const html = LoginNotificationTemplate({
    userName: userName || "User",
    loginTime,
    ipAddress,
    deviceInfo,
    location,
  });
  await sendMail(email, subject, html);
}

async function sendPasswordResetEmail(email, userName, resetToken) {
  const resetLink = `${system.APP_URL}/auth/reset-password?token=${resetToken}`;

  const subject = "Reset your FUS password";

  const html = ForgotPasswordTemplate({
    userName: userName || "there",
    resetLink,
  });

  await sendMail(email, subject, html);
}

module.exports = {
  sendVerificationEmail,
  sendVerificationEmailReminder,
  sendLoginNotificationEmail,
  sendPasswordResetEmail,
};
