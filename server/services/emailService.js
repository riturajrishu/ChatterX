const sgMail = require('@sendgrid/mail');

const sendSignedUpOTP = async (email, otp) => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY is missing from environment variables.');
      throw new Error('Email service not configured.');
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

    const msg = {
      from: `"Whispr Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Signup Verification Code - Whispr',
      html: htmlContent,
    };

    const response = await sgMail.send(msg);
    console.log('SendGrid Response:', {
      statusCode: response[0].statusCode,
      headers: response[0].headers,
    });
    return true;
  } catch (error) {
    console.error('Email sending error details:', {
      message: error.message,
      code: error.code,
      response: error.response ? error.response.body : 'No response body',
    });
    throw new Error('Could not send verification email. Please try again later.');
  }
};

module.exports = {
  sendSignedUpOTP,
};
