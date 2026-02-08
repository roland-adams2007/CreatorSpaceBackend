// emails/EmailLayout.js
function EmailLayout({ children, title = "FUS" }) {
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#000000;">
    <!-- Main Container -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;">
        <tr>
            <td align="center" style="padding:0;">
                <!-- Email Container -->
                <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#000000;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding:40px 0 32px 0;text-align:left;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding:0 24px;">
                                        <h1 style="margin:0;color:#e50914;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                                            FUS
                                        </h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding:0 24px 48px 24px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;">
                                <tr>
                                    <td style="color:#ffffff;font-size:15px;line-height:24px;font-weight:400;">
                                        ${children}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding:32px 24px 40px 24px;border-top:1px solid #333333;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding-bottom:24px;">
                                        <p style="margin:0;color:#808080;font-size:13px;line-height:20px;">
                                            Questions? Contact us at <a href="mailto:support@FUS.com" style="color:#808080;text-decoration:underline;">support@FUS.com</a>
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-bottom:16px;">
                                        <table cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding-right:24px;">
                                                    <a href="#" style="color:#808080;font-size:13px;text-decoration:underline;">Account</a>
                                                </td>
                                                <td style="padding-right:24px;">
                                                    <a href="#" style="color:#808080;font-size:13px;text-decoration:underline;">Help Center</a>
                                                </td>
                                                <td>
                                                    <a href="#" style="color:#808080;font-size:13px;text-decoration:underline;">Privacy</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <p style="margin:0;color:#808080;font-size:12px;line-height:18px;">
                                            © ${year} FUS, Inc.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Bottom Spacer -->
                    <tr>
                        <td style="padding:0 24px 24px 24px;">
                            <p style="margin:0;color:#808080;font-size:11px;line-height:16px;">
                                This email was sent to you by FUS. If you prefer not to receive emails from us, you can <a href="#" style="color:#808080;text-decoration:underline;">unsubscribe</a>.
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `.trim();
}

module.exports = { EmailLayout };
