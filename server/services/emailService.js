const { google } = require('googleapis');

/**
 * Creates an OAuth2 client for Gmail API
 */
const createOAuth2Client = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground' // Default redirect URI for playground tokens
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return oauth2Client;
};

const sendSignedUpOTP = async (email, otp) => {
  console.log('Starting Gmail REST API sendSignedUpOTP for:', email);
  
  try {
    if (!process.env.GMAIL_REFRESH_TOKEN) {
      console.error('GMAIL_REFRESH_TOKEN is missing!');
      throw new Error('Email service not configured - missing Refresh Token.');
    }

    const oauth2Client = createOAuth2Client();
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Sanitize fromEmail to remove potentially problematic quotes from .env
    const fromEmail = (process.env.SMTP_USER || '').replace(/['"]/g, '');
    
    if (!fromEmail) {
      console.error('SMTP_USER is missing or invalid for "From" address!');
      throw new Error('Email "From" address is not configured.');
    }

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
    const rawEmail = [
      `From: "Whispr Support" <${fromEmail}>`,
      `To: ${email}`,
      `Subject: Your Signup Verification Code - Whispr`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      htmlContent,
    ].join('\r\n');

    // Encode email to Base64url
    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log(`Calling Gmail API Users.messages.send for ${email}...`);
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    console.log('Gmail API Result:', result.status, result.statusText);
    return true;
  } catch (error) {
    console.error('Gmail REST API error (Detailed):', error);
    if (error.message.includes('invalid_grant')) {
      throw new Error('Gmail service error: The Refresh Token has expired or is invalid. Please update your GMAIL_REFRESH_TOKEN.');
    }
    throw new Error('Could not send verification email: ' + error.message);
  }
};

module.exports = {
  sendSignedUpOTP,
};
