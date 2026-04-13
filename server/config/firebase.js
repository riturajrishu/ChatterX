const admin = require('firebase-admin');

let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    console.warn('Firebase: No service account configured — push notifications disabled.');
    return;
  }

  try {
    const parsed = JSON.parse(serviceAccount);
    
    // Fix for private key newline formatting in some environments
    if (parsed.private_key && typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
      credential: admin.credential.cert(parsed),
    });
    firebaseInitialized = true;
    console.log('Firebase Admin SDK initialized.');
  } catch (error) {
    console.error('Firebase initialization failed:', error.message);
  }
};

const getFirebaseAdmin = () => {
  if (!firebaseInitialized) return null;
  return admin;
};

module.exports = { initializeFirebase, getFirebaseAdmin };
