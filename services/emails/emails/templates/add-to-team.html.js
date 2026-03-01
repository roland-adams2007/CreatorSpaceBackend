// emails/templates/team-invite.html.js
const { EmailLayout } = require("../EmailLayout");

function TeamInviteTemplate({
  inviterName = "Someone",
  inviteLink,
  role = "member",
  expiresIn = 7, // days
  websiteName = "Creator Workspace",
}) {
  const content = `
    <!-- Team Invite Message -->
    <h2 style="margin:0 0 16px 0;color:#ffffff;font-size:32px;font-weight:700;line-height:1.2;letter-spacing:-0.5px;">
      Join ${websiteName}
    </h2>
   
    <p style="margin:0 0 24px 0;color:#ffffff;font-size:16px;line-height:26px;font-weight:400;">
      Hi there,
    </p>
   
    <p style="margin:0 0 16px 0;color:#ffffff;font-size:16px;line-height:26px;font-weight:400;">
      <strong style="color:#e50914;">${inviterName}</strong> has invited you to join <strong style="color:#e50914;">${websiteName}</strong> as a <strong style="color:#e50914;">${role}</strong>.
    </p>
   
    <p style="margin:0 0 32px 0;color:#ffffff;font-size:16px;line-height:26px;font-weight:400;">
      Collaborate with your team to build and manage stunning websites, create dynamic pages using our JSON-based builder, and bring your creative visions to life together.
    </p>
   
    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 40px 0;">
      <tr>
        <td align="left">
          <a href="${inviteLink}"
             style="display:inline-block;padding:16px 48px;background-color:#e50914;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:600;font-size:16px;letter-spacing:0.3px;transition:background-color 0.2s;">
            Accept Invitation
          </a>
        </td>
      </tr>
    </table>
   
    <!-- Divider -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;">
      <tr>
        <td style="border-top:1px solid #333333;padding:0;"></td>
      </tr>
    </table>
   
    <!-- Alternative Link -->
    <p style="margin:0 0 8px 0;color:#808080;font-size:13px;line-height:20px;">
      Button not working? Copy and paste this link into your browser:
    </p>
   
    <p style="margin:0 0 32px 0;color:#808080;font-size:13px;line-height:20px;word-break:break-all;">
      ${inviteLink}
    </p>
   
    <!-- Benefits -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;">
      <tr>
        <td style="padding:20px 24px;background-color:#1a1a1a;">
          <p style="margin:0 0 16px 0;color:#ffffff;font-size:14px;font-weight:600;line-height:20px;">
            What you can do here:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:0 0 8px 12px;color:#b3b3b3;font-size:13px;line-height:20px;">• Create and manage multiple websites from one dashboard</td>
            </tr>
            <tr>
              <td style="padding:0 0 8px 12px;color:#b3b3b3;font-size:13px;line-height:20px;">• Build pages dynamically with our JSON-based website builder</td>
            </tr>
            <tr>
              <td style="padding:0 0 8px 12px;color:#b3b3b3;font-size:13px;line-height:20px;">• Collaborate on website layouts and content in real-time</td>
            </tr>
            <tr>
              <td style="padding:0 0 8px 12px;color:#b3b3b3;font-size:13px;line-height:20px;">• Access tenant-based routing for your sites</td>
            </tr>
            <tr>
              <td style="padding:0;color:#b3b3b3;font-size:13px;line-height:20px;">• Apply and customize themes across your websites</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
   
    <!-- Role-Specific Information -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;">
      <tr>
        <td style="padding:16px 24px;background-color:#1a1a1a;border-left:3px solid #e50914;">
          <p style="margin:0;color:#ffffff;font-size:14px;font-weight:600;line-height:20px;">
            Your Role: ${role.charAt(0).toUpperCase() + role.slice(1)}
          </p>
          <p style="margin:8px 0 0 0;color:#b3b3b3;font-size:13px;line-height:20px;">
            ${getRoleDescription(role)}
          </p>
        </td>
      </tr>
    </table>
   
    <!-- Invite Details Notice -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0 0;background-color:#1a1a1a;border-left:3px solid #e50914;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 8px 0;color:#ffffff;font-size:14px;font-weight:600;line-height:20px;">
            Invitation Details
          </p>
          <p style="margin:0 0 4px 0;color:#b3b3b3;font-size:13px;line-height:20px;">
            <strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}
          </p>
          <p style="margin:0 0 4px 0;color:#b3b3b3;font-size:13px;line-height:20px;">
            <strong>Invited by:</strong> ${inviterName}
          </p>
          <p style="margin:0 0 8px 0;color:#b3b3b3;font-size:13px;line-height:20px;">
            <strong>Expires:</strong> In ${expiresIn} days
          </p>
          <p style="margin:0;color:#b3b3b3;font-size:13px;line-height:20px;">
            If you weren't expecting this invitation, you can safely ignore this email. No account will be created without your confirmation. To access this workspace, you'll need to verify your email address first.
          </p>
        </td>
      </tr>
    </table>
  `;

  return EmailLayout({
    title: `Join ${websiteName}`,
    children: content,
  });
}

// Helper function for role descriptions
function getRoleDescription(role) {
  const descriptions = {
    owner:
      "As the owner, you have complete control over the platform — manage members, billing, all websites, and every setting.",
    admin:
      "As an admin, you have full control over the workspace including managing members, billing, and all websites.",
    editor:
      "As an editor, you can create, modify, and publish websites, pages, and content.",
    viewer:
      "As a viewer, you can view websites, layouts, and content, and provide feedback, but cannot make changes.",
  };
  return descriptions[role] || descriptions.editor;
}

module.exports = { TeamInviteTemplate };
