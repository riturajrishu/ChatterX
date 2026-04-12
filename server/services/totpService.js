const crypto = require('crypto');
const { TOTP, Secret } = require('otpauth');
const QRCode = require('qrcode');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

const getEncryptionKey = () => {
  const key = process.env.TOTP_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('TOTP_ENCRYPTION_KEY must be at least 32 characters.');
  }
  return Buffer.from(key.slice(0, 32), 'utf-8');
};

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

const decrypt = (encryptedText) => {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

const generateTOTPSecret = (email) => {
  const secret = new Secret({ size: 20 });

  const totp = new TOTP({
    issuer: 'Whispr',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  return {
    secret: secret.base32,
    otpauthUrl: totp.toString(),
  };
};

const generateQRCode = async (otpauthUrl) => {
  return QRCode.toDataURL(otpauthUrl);
};

const verifyTOTP = (secret, token) => {
  const totp = new TOTP({
    issuer: 'Whispr',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
};

module.exports = {
  encrypt,
  decrypt,
  generateTOTPSecret,
  generateQRCode,
  verifyTOTP,
};
