const { User } = require('./models');
const sequelize = require('./config/db');
const { Op } = require('sequelize');

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function fixNames() {
    try {
        const users = await User.findAll();

        for (const user of users) {
            let newName = user.name;
            const originalName = user.name;

            // Check if name looks like an email prefix (contains . or numbers)
            if (newName.includes('.') || /\d/.test(newName)) {

                const parts = newName.split('.');

                if (user.role === 'student' && parts.length >= 2) {
                    // Pattern: name.regno (e.g. rakshat.23fe...)
                    // Take the first part as the name
                    newName = capitalize(parts[0]);
                } else if (parts.length === 2) {
                    // Pattern: first.last (e.g. alice.smith)
                    newName = `${capitalize(parts[0])} ${capitalize(parts[1])}`;
                } else {
                    // Just capitalize what we have if it's a single word with numbers
                    // e.g. "student1" -> "Student1" (Maybe leave numbers for generic accounts)
                    // But for "hod.cs", parts length is 2, so it becomes "Hod Cs"
                    newName = parts.map(p => capitalize(p)).join(' ');
                }
            }

            // Special Case for HOD
            if (user.email === 'hod.cs@jaipur.manipal.edu') {
                newName = 'HOD Computer Science';
            }

            if (newName !== originalName) {
                console.log(`Renaming: ${originalName} -> ${newName}`);
                user.name = newName;
                await user.save();
            }
        }
        console.log('Name cleanup complete.');

    } catch (error) {
        console.error('Error:', error);
    }
}

fixNames();
