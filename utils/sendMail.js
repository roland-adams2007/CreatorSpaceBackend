const nodemailer = require("nodemailer");
const { mail_config, system } = require("../config/config.inc");

const transporter = nodemailer.createTransport({
  host: mail_config.host,
  port: mail_config.port,
  secure: mail_config.secure,
  auth: {
    user: mail_config.auth.user,
    pass: mail_config.auth.pass,
  },
});

async function sendMail(to, subject, html, from = null) {
  try {
    const info = await transporter.sendMail({
      from: `"${from || system.APP_NAME}" <${mail_config.auth.user}>`,
      to,
      subject,
      html,
    });

    return info;
  } catch (error) {
    throw error;
  }
}

module.exports = sendMail;
