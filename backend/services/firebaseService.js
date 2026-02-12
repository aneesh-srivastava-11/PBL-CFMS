const admin = require('../config/firebaseAdmin');
const logger = require('../utils/logger');

/**
 * Creates a new user in Firebase Authentication.
 * If the user already exists, it fetches and returns the existing UID.
 * 
 * @param {string} email 
 * @param {string} password 
 * @param {string} displayName 
 * @returns {Promise<string>} The Firebase UID
 */
exports.createFirebaseUser = async (email, password, displayName) => {
    try {
        // Attempt to create the user
        const userRecord = await admin.auth().createUser({
            email: email,
            emailVerified: false,
            password: password,
            displayName: displayName,
            disabled: false
        });

        logger.info(`[Firebase] Successfully created new user: ${email} (${userRecord.uid})`);
        return userRecord.uid;

    } catch (error) {
        // If user already exists, fetch their UID
        if (error.code === 'auth/email-already-exists') {
            logger.info(`[Firebase] User already exists in Firebase: ${email}. Fetching UID...`);
            try {
                const userRecord = await admin.auth().getUserByEmail(email);
                return userRecord.uid;
            } catch (fetchError) {
                logger.error(`[Firebase] Failed to fetch existing user ${email}: ${fetchError.message}`);
                throw fetchError;
            }
        }

        logger.error(`[Firebase] Error creating user ${email}: ${error.message}`);
        // We throw so the controller knows something went wrong, 
        // though we might want to fail gracefully in bulk imports.
        throw error;
    }
};
