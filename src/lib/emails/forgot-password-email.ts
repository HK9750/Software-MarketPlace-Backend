export const generatePasswordResetEmailHtml = (
    username: string,
    resetCode: string,
    resetLink?: string
): string => {
    return `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Reset Your CodeVault Password</title>
        </head>
        <body
          style="
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background-color: #f4f4f9;
            color: #333;
          "
        >
          <!-- Outer Wrapper -->
          <table
            role="presentation"
            cellspacing="0"
            cellpadding="0"
            border="0"
            width="100%"
            style="background-color: #f4f4f9; margin: 0; padding: 0;"
          >
            <tr>
              <td align="center">
                <!-- Email Container -->
                <table
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  width="600"
                  style="
                    background-color: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    margin: 20px auto;
                  "
                >
                  <!-- Header -->
                  <tr>
                    <td
                      style="
                        background-color: #e74c3c;
                        color: #ffffff;
                        text-align: center;
                        padding: 20px 10px;
                        font-size: 24px;
                        border-top-left-radius: 8px;
                        border-top-right-radius: 8px;
                      "
                    >
                      <strong>Password Reset Request</strong>
                    </td>
                  </tr>
      
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px 20px; text-align: left;">
                      <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.6;">
                        Hi <strong>${username}</strong>,
                      </p>
                      <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.6;">
                        We received a request to reset your password for your CodeVault account.
                        Please use the verification code below to complete the password reset process:
                      </p>
      
                      <!-- Reset Code Button -->
                      <p style="text-align: center; margin: 30px 0;">
                        <span
                          style="
                            display: inline-block;
                            background-color: #e74c3c;
                            color: #ffffff;
                            text-decoration: none;
                            font-size: 24px;
                            font-weight: bold;
                            padding: 15px 30px;
                            border-radius: 4px;
                            letter-spacing: 2px;
                          "
                        >
                          ${resetCode}
                        </span>
                      </p>
                      
                      <p style="margin: 15px 0; font-size: 16px; line-height: 1.6; color: #d32f2f; font-weight: bold;">
                        This code will expire in 5 minutes for security reasons.
                      </p>
                      
                      ${
                          resetLink
                              ? `
                      <p style="margin: 25px 0; text-align: center;">
                        <a
                          href="${resetLink}"
                          style="
                            display: inline-block;
                            background-color: #2e3b55;
                            color: #ffffff;
                            text-decoration: none;
                            font-size: 16px;
                            font-weight: bold;
                            padding: 12px 25px;
                            border-radius: 4px;
                          "
                        >
                          Reset Password
                        </a>
                      </p>
                      `
                              : ''
                      }
      
                      <p style="margin: 20px 0 15px; font-size: 16px; line-height: 1.6;">
                        If you didn't request a password reset, please ignore this email or contact
                        our support team immediately if you believe your account may be compromised.
                      </p>
                      
                      <p style="margin: 20px 0 15px; font-size: 16px; line-height: 1.6;">
                        Your account security is important to us, as it protects your subscription 
                        and payment information within our marketplace.
                      </p>
                    </td>
                  </tr>
      
                  <!-- Security Notice -->
                  <tr>
                    <td style="padding: 0 20px 20px; text-align: left;">
                      <div style="
                        background-color: #f9f9f9;
                        border-left: 4px solid #e74c3c;
                        padding: 15px;
                        margin-bottom: 20px;
                        font-size: 14px;
                        line-height: 1.6;
                      ">
                        <p style="margin: 0 0 10px; font-weight: bold;">Security Reminder:</p>
                        <p style="margin: 0;">
                          CodeVault will never ask for your password or personal information via email.
                          Always access our marketplace directly through your browser and not through email links.
                          We utilize secure PayPro integration to protect all your payment information.
                        </p>
                      </div>
                    </td>
                  </tr>
      
                  <!-- Footer -->
                  <tr>
                    <td
                      style="text-align: center; font-size: 12px; color: #777777; padding: 20px 10px; border-top: 1px solid #eeeeee;"
                    >
                      <p style="margin: 0;">
                        &copy; ${new Date().getFullYear()} CodeVault. All rights reserved.
                      </p>
                      <p style="margin: 10px 0 0;">
                        Need help? Contact us at
                        <a
                          href="mailto:support@codevault.com"
                          style="color: #2e3b55; text-decoration: none;"
                          >support@codevault.com</a
                        >
                      </p>
                    </td>
                  </tr>
                </table>
                <!-- End Container -->
              </td>
            </tr>
          </table>
        </body>
      </html>`;
};
