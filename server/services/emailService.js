const { google } = require('googleapis');

const createOAuth2Client = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return oauth2Client;
};

const sendSignedUpOTP = async (email, otp) => {
  try {
    if (!process.env.GMAIL_REFRESH_TOKEN) {
      console.error('GMAIL_REFRESH_TOKEN is missing from environment variables.');
      throw new Error('Email service not configured.');
    }

    const oauth2Client = createOAuth2Client();
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // HTML email template
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4a154b; text-align: center;">Welcome to Whispr!</h2>
        <p style="font-size: 16px; color: #333;">Hello,</p>
        <p style="font-size: 16px; color: #333;">Please use the following One Time Password (OTP) to complete your account registration. This OTP is valid for 5 minutes.</p>
        
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h1 style="margin: 0; font-size: 32px; letter-spacing: 5px; color: #333;">${otp}</h1>
        </div>
        
        <p style="font-size: 14px; color: #777;">If you did not request this OTP, please ignore this email.</p>
        <br>
        <p style="font-size: 14px; color: #333;">Best regards,<br><strong>Whispr Team</strong></p>
      </div>
    `;

    // Build the email in RFC 2822 format
    const fromEmail = process.env.SMTP_USER;
    const rawEmail = [
      `From: "Whispr Support" <${fromEmail}>`,
      `To: ${email}`,
      `Subject: Your Signup Verification Code - Whispr`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      htmlContent,
    ].join('\r\n');

    // Base64url encode the email
    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail REST API (HTTPS, port 443 — no SMTP needed)
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    console.log(`OTP email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error('Email sending error:', error.message);
    throw new Error('Could not send verification email. Please try again later.');
  }
};

module.exports = {
  sendSignedUpOTP,
};
