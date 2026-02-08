// emails/templates/loginNotification.html.js
const { EmailLayout } = require('../EmailLayout');

function LoginNotificationTemplate({ 
  userName = "there", 
  loginTime, 
  ipAddress, 
  deviceInfo = "Unknown device",
  location = "Unknown location"
}) {
  const content = `
    <!-- Header -->
    <h2 style="margin:0 0 16px 0;color:#ffffff;font-size:32px;font-weight:700;line-height:1.2;letter-spacing:-0.5px;">
      New Sign-In to Your Account
    </h2>
    
    <p style="margin:0 0 32px 0;color:#ffffff;font-size:16px;line-height:26px;font-weight:400;">
      Hi ${userName}, we detected a new sign-in to your CineBook account. If this was you, no action is needed.
    </p>

    <!-- Login Details Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;background-color:#1a1a1a;border:1px solid #333333;border-radius:4px;">
      <tr>
        <td style="padding:24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            <tr>
              <td style="padding:8px 0;color:#808080;font-weight:500;width:120px;vertical-align:top;">
                Time
              </td>
              <td style="padding:8px 0;color:#ffffff;font-weight:400;">
                ${loginTime}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid #2a2a2a;"></td>
              <td style="padding:8px 0;border-top:1px solid #2a2a2a;"></td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#808080;font-weight:500;vertical-align:top;">
                Device
              </td>
              <td style="padding:8px 0;color:#ffffff;font-weight:400;">
                ${deviceInfo}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid #2a2a2a;"></td>
              <td style="padding:8px 0;border-top:1px solid #2a2a2a;"></td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#808080;font-weight:500;vertical-align:top;">
                IP Address
              </td>
              <td style="padding:8px 0;color:#ffffff;font-weight:400;">
                ${ipAddress}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-top:1px solid #2a2a2a;"></td>
              <td style="padding:8px 0;border-top:1px solid #2a2a2a;"></td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#808080;font-weight:500;vertical-align:top;">
                Location
              </td>
              <td style="padding:8px 0;color:#ffffff;font-weight:400;">
                ${location}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Divider -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;">
      <tr>
        <td style="border-top:1px solid #333333;padding:0;"></td>
      </tr>
    </table>

    <!-- Info Message -->
    <p style="margin:0 0 32px 0;color:#b3b3b3;font-size:15px;line-height:24px;font-weight:400;">
      If this was you, you can safely ignore this email. We're just letting you know as part of our security monitoring.
    </p>

    <!-- Security Alert Box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0 0;background-color:#1a1a1a;border-left:3px solid #e50914;">
      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 12px 0;color:#ffffff;font-size:15px;font-weight:600;line-height:22px;">
            Wasn't You?
          </p>
          <p style="margin:0 0 20px 0;color:#b3b3b3;font-size:14px;line-height:22px;">
            If you don't recognize this activity, secure your account immediately by resetting your password.
          </p>
          <a href="${process.env.APP_URL}/auth/password/reset" 
             style="display:inline-block;padding:12px 32px;background-color:#e50914;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:600;font-size:14px;letter-spacing:0.3px;">
            Secure Account
          </a>
        </td>
      </tr>
    </table>

    <!-- Additional Security Info -->
    <p style="margin:32px 0 0 0;color:#808080;font-size:13px;line-height:20px;">
      For your security, we recommend using a strong, unique password and enabling two-factor authentication if available.
    </p>
  `;

  return EmailLayout({
    title: "New sign-in to your CineBook account",
    children: content
  });
}

module.exports = { LoginNotificationTemplate };