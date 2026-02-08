// emails/templates/forgot-password.html.js
const { EmailLayout } = require("../EmailLayout");

function ForgotPasswordTemplate({ userName = "there", resetLink }) {
  const content = `
    <!-- Reset Password Message -->
    <h2 style="margin:0 0 16px 0;color:#ffffff;font-size:32px;font-weight:700;line-height:1.2;letter-spacing:-0.5px;">
      Reset Your Password
    </h2>
    
    <p style="margin:0 0 24px 0;color:#ffffff;font-size:16px;line-height:26px;font-weight:400;">
      Hi${userName !== "there" ? ` ${userName}` : ""},
    </p>
    
    <p style="margin:0 0 32px 0;color:#ffffff;font-size:16px;line-height:26px;font-weight:400;">
      We received a request to reset your password for your CineBook account. Click the button below to create a new password.
    </p>
    
    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 40px 0;">
      <tr>
        <td align="left">
          <a href="${resetLink}"
             style="display:inline-block;padding:16px 48px;background-color:#e50914;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:600;font-size:16px;letter-spacing:0.3px;transition:background-color 0.2s;">
            Reset Password
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
      ${resetLink}
    </p>
    
    <!-- Security Notice -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0 0;background-color:#1a1a1a;border-left:3px solid #e50914;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 8px 0;color:#ffffff;font-size:14px;font-weight:600;line-height:20px;">
            Security Notice
          </p>
          <p style="margin:0;color:#b3b3b3;font-size:13px;line-height:20px;">
            This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact our support team immediately to secure your account.
          </p>
        </td>
      </tr>
    </table>
  `;

  return EmailLayout({
    title: "Reset your password - CineBook",
    children: content,
  });
}

module.exports = { ForgotPasswordTemplate };
