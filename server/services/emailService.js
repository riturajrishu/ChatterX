const sendSignedUpOTP = async (email, otp) => {
  try {
    const emailServiceUrl = process.env.EMAIL_SERVICE_URL;
    const emailServiceKey = process.env.EMAIL_SERVICE_API_KEY;

    if (!emailServiceUrl || !emailServiceKey) {
      console.error('EMAIL_SERVICE_URL or EMAIL_SERVICE_API_KEY is missing.');
      throw new Error('Email service not configured.');
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

    const response = await fetch(`${emailServiceUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': emailServiceKey,
      },
      body: JSON.stringify({
        from: `"Whispr Support" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Signup Verification Code - Whispr',
        html: htmlContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Email proxy error:', data);
      throw new Error(data.error || 'Email proxy failed');
    }

    console.log('Email sent via proxy:', data);
    return true;
  } catch (error) {
    console.error('Email sending error:', error.message);
    throw new Error('Could not send verification email. Please try again later.');
  }
};

module.exports = {
  sendSignedUpOTP,
};
