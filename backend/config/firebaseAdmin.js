const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Placeholder: You need to download serviceAccountKey.json from Firebase Console
// and place it in the config folder, OR use environment variables.

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

try {
    // Check if we have env vars instead
    if (process.env.FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Handle newlines in private key
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            })
        });
        console.log("Firebase Admin initialized with ENV variables");
    } else {
        // Fallback to file
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized with serviceAccountKey.json");
    }
} catch (error) {
    console.error("Firebase Admin Initialization Failed: ", error.message);
    console.error("Please ensure you have 'serviceAccountKey.json' in backend/config OR set FIREBASE_ env vars.");
}

module.exports = admin;
