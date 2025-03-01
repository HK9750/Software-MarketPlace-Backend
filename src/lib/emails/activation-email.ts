export const generateActivationEmailHtml = (
  username: string,
  activationCode: string
): string => {
  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to CodeVault</title>
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
                      background-color: #2e3b55;
                      color: #ffffff;
                      text-align: center;
                      padding: 20px 10px;
                      font-size: 24px;
                      border-top-left-radius: 8px;
                      border-top-right-radius: 8px;
                    "
                  >
                    <strong>Welcome to CodeVault!</strong>
                  </td>
                </tr>
    
                <!-- Content -->
                <tr>
                  <td style="padding: 20px; text-align: left;">
                    <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.6;">
                      Hi <strong>${username}</strong>,
                    </p>
                    <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.6;">
                      Thank you for joining <strong>CodeVault</strong>, the premier marketplace
                      for discovering and purchasing quality software solutions. We're excited to
                      have you onboard!
                    </p>
                    <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.6;">
                      Please use the following code to activate your account and start exploring
                      our extensive catalog of software products:
                    </p>
    
                    <!-- Activation Code Button -->
                    <p style="text-align: center; margin: 20px 0;">
                      <span
                        style="
                          display: inline-block;
                          background-color: #2e3b55;
                          color: #ffffff;
                          text-decoration: none;
                          font-size: 24px;
                          font-weight: bold;
                          padding: 15px 30px;
                          border-radius: 4px;
                          letter-spacing: 2px;
                        "
                      >
                        ${activationCode}
                      </span>
                    </p>
                    
                    <p style="margin: 15px 0; font-size: 16px; line-height: 1.6;">
                      This code will expire in 5 minutes for security reasons.
                    </p>
    
                    <p style="margin: 20px 0 15px; font-size: 16px; line-height: 1.6;">
                      With CodeVault, you can:
                    </p>
                    
                    <ul style="margin: 0 0 20px; padding-left: 20px;">
                      <li style="margin-bottom: 10px; font-size: 16px;">Access a curated catalog of premium software solutions</li>
                      <li style="margin-bottom: 10px; font-size: 16px;">Choose from flexible subscription plans (1-month, 6-month, or 1-year)</li>
                      <li style="margin-bottom: 10px; font-size: 16px;">Receive price drop notifications for products in your wishlist</li>
                      <li style="margin-bottom: 10px; font-size: 16px;">Browse detailed software compatibility and feature information</li>
                    </ul>
    
                    <p style="margin: 0 0 15px; font-size: 16px; line-height: 1.6;">
                      If you have any questions or need assistance, our
                      support team is always here to help you find the perfect software solution.
                    </p>
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
