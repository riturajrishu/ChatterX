const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// Simple API key authentication
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Gmail SMTP transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'whispr-email-proxy' });
});

// Send email endpoint
app.post('/api/send-email', authenticate, async (req, res) => {
  try {
    const { from, to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    const transporter = createTransporter();

    await transporter.sendMail({
      from: from || `"Whispr Support" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`Email sent successfully to: ${to}`);
    res.json({ success: true, message: 'Email sent' });
  } catch (error) {
    console.error('Email send error:', error.message);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`📧 Whispr Email Proxy running on port ${PORT}`);
});
