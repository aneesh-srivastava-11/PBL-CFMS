const admin = require('./config/firebaseAdmin');
const { User } = require('./models');
const sequelize = require('./config/db');

async function syncUsers() {
    try {
        console.log('Fetching users from Firebase...');
        const listUsersResult = await admin.auth().listUsers(1000);
        const firebaseUsers = listUsersResult.users;

        console.log(`Found ${firebaseUsers.length} users in Firebase.`);

        let added = 0;
        let existed = 0;
        let errors = 0;

        for (const fbUser of firebaseUsers) {
            const email = fbUser.email;
            if (!email) {
                console.warn(`Skipping user with no email: ${fbUser.uid}`);
                continue;
            }

            // Determine Role based on domain
            let role = 'student';
            if (email.endsWith('@jaipur.manipal.edu')) {
                role = 'faculty';
            } else if (email === 'hod.cs@jaipur.manipal.edu') {
                role = 'hod'; // Explicit check though domain matches faculty
            }

            // Determine Name
            const name = fbUser.displayName || email.split('@')[0];

            try {
                const [user, created] = await User.findOrCreate({
                    where: { email: email },
                    defaults: {
                        name: name,
                        email: email,
                        role: role,
                        firebase_uid: fbUser.uid,
                        password: 'password123' // Default password for local sign-in if needed
                    }
                });

                if (created) {
                    console.log(`[CREATED] ${email} (${role})`);
                    added++;
                } else {
                    // Update firebase_uid if missing
                    if (!user.firebase_uid) {
                        user.firebase_uid = fbUser.uid;
                        await user.save();
                        console.log(`[UPDATED] ${email} - Linked Firebase UID`);
                    } else {
                        // console.log(`[EXISTS] ${email}`);
                    }
                    existed++;
                }
            } catch (err) {
                console.error(`[ERROR] Failed to process ${email}: ${err.message}`);
                errors++;
            }
        }

        console.log(`\nSync Complete.`);
        console.log(`Added: ${added}`);
        console.log(`Existed/Updated: ${existed}`);
        console.log(`Errors: ${errors}`);

    } catch (error) {
        console.error('Sync failed:', error);
    }
}

syncUsers();
