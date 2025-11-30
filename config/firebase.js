const admin = require('firebase-admin');

// Initialize Firebase Admin with different approaches
function initializeFirebase() {
  try {
    // Method 1: Check for service account JSON file
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      console.log('Initializing Firebase with service account JSON...');
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://raaz-cf574-default-rtdb.firebaseio.com"
      });
    }
    // Method 2: Individual environment variables
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      console.log('Initializing Firebase with individual env variables...');
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "key-id",
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
      };
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://raaz-cf574-default-rtdb.firebaseio.com"
      });
    }
    // Method 3: Use default configuration (for development)
    else {
      console.log('Initializing Firebase with default configuration...');
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: "https://raaz-cf574-default-rtdb.firebaseio.com"
      });
    }
    
    console.log('✅ Firebase Admin initialized successfully');
    return admin;
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
  }
}

const adminApp = initializeFirebase();
const db = adminApp.database();
const auth = adminApp.auth();

module.exports = { admin: adminApp, db, auth };
