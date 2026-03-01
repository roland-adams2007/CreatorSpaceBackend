// services/email/authEmailService.js
const sendMail = require("../../utils/sendMail");
const { TeamInviteTemplate } = require("./emails/templates/add-to-team.html");
const { system } = require("../../config/config.inc");

async function sendTeamInviteEmail({
  to,
  websiteName,
  expiresIn,
  invitationLink,
  role,
  token,
  inviterName,
}) {
  const subject = "You've been invited to join a team on Creator Workspace!";

  // Convert milliseconds to days
  const expiresInDays = Math.ceil(expiresIn / (24 * 60 * 60 * 1000));

  const html = TeamInviteTemplate({
    websiteName: websiteName || "Creator Workspace",
    inviteLink: invitationLink,
    expiresIn: expiresInDays,
    role: role,
    inviterName: inviterName || "A team member",
  });

  await sendMail(to, subject, html);
}

module.exports = { sendTeamInviteEmail };
