import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailTemplate {
  /**
   * Generates a stylized OTP content block
   */
  otp(code: string) {
    return `
      <h2>Verify your identity</h2>
      <p>Please use the verification code below to complete your action. This code is valid for <strong>10 minutes</strong>.</p>
      <div class="inner-card">
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #2563EB;">${code}</span>
      </div>
      <p>For your security, never share this code with anyone.</p>
    `;
  }

  /**
   * Generates a welcome message for newly verified users
   */
  welcome(firstName: string) {
    return `
      <h2>Welcome to ProsperaFinWealth, ${firstName}!</h2>
      <p>Your account has been successfully verified. You now have full access to our investment terminal.</p>
      <p>Start by exploring our current investment plans to begin growing your portfolio.</p>
      <div style="text-align: center;">
         <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #2563EB; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Visit Dashboard</a>
      </div>
    `;
  }

  /**
   * The Main Wrapper (Your updated professional design)
   */
  getEmailWrapper = (content: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TopEquity Notification</title>
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; }
          .wrapper { width: 100%; background-color: #F8FAFC; padding-bottom: 40px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #E2E8F0; margin-top: 40px; overflow: hidden; }
          .header { padding: 40px 20px; text-align: center; background-color: #0F172A; }
          .logo-text { color: #FFFFFF; font-size: 22px; font-weight: 800; margin: 0; text-transform: uppercase; }
          .content { padding: 40px; line-height: 1.6; color: #334155; font-size: 16px; }
          .inner-card { background-color: #F1F5F9; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0; border: 1px dashed #CBD5E1; }
          .footer { padding: 30px; text-align: center; font-size: 13px; color: #94A3B8; }
          hr { border: 0; border-top: 1px solid #E2E8F0; margin: 30px 0; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1 class="logo-text">TOP<span style="color: #38BDF8;">EQUITY5</span></h1>
            </div>
            <div class="content">
              ${content}
              <hr />
              <p style="font-size: 13px; color: #94A3B8; text-align: center;">
                This is an automated security notification from ProsperFinWealth. 
              </p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} ProsperaFinWealth Inc.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
