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

/**
 * Deletes a user from Firebase Authentication.
 * 
 * @param {string} uid - The Firebase UID of the user to delete
 * @returns {Promise<void>}
 */
exports.deleteFirebaseUser = async (uid) => {
    try {
        await admin.auth().deleteUser(uid);
        logger.info(`[Firebase] Successfully deleted user with UID: ${uid}`);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            logger.warn(`[Firebase] User with UID ${uid} not found in Firebase. Skipping.`);
            return;
        }
        logger.error(`[Firebase] Error deleting user ${uid}: ${error.message}`);
        throw error;
    }
};
