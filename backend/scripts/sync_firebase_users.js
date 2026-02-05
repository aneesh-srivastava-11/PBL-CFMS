const admin = require('../config/firebaseAdmin');
const { User } = require('../models');

const syncUsersToFirebase = async () => {
    try {
        console.log('Starting sync...');
        await User.sequelize.authenticate();
        console.log('Database connected.');

        const users = await User.findAll();
        console.log(`Found ${users.length} users in local DB.`);

        if (!admin.auth) {
            console.error('Admin Auth is undefined!');
            process.exit(1);
        }

        for (const user of users) {
            console.log(`Processing user: ${user.email}`);
            try {
                // Check if user exists in Firebase
                try {
                    console.log(`Checking Firebase for ${user.email}...`);
                    await admin.auth().getUserByEmail(user.email);
                    console.log(`User ${user.email} already exists in Firebase.`);
                } catch (error) {
                    if (error.code === 'auth/user-not-found') {
                        console.log(`Creating user in Firebase: ${user.email}`);
                        const firebaseUser = await admin.auth().createUser({
                            email: user.email,
                            emailVerified: true,
                            password: user.password || 'password123', // Default password if not set
                            displayName: user.name,
                            disabled: false,
                        });
                        console.log(`Successfully created Firebase user: ${firebaseUser.uid}`);

                        // Optionally update local DB with Firebase UID if needed
                        if (!user.firebase_uid) {
                            user.firebase_uid = firebaseUser.uid;
                            await user.save();
                        }

                    } else {
                        console.error(`Error checking user ${user.email}:`, error.code, error.message);
                    }
                }
            } catch (innerError) {
                console.error(`Failed to process user ${user.email}:`, innerError);
            }
        }

        console.log('Sync completed.');
        process.exit(0);
    } catch (error) {
        console.error('Fatal Error:', error);
        process.exit(1);
    }
};

syncUsersToFirebase();
