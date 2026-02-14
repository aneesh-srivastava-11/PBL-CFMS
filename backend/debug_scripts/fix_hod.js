const { User } = require('./models');
const sequelize = require('./config/db');

async function fixHodRole() {
    try {
        const hod = await User.findOne({
            where: { email: 'hod.cs@jaipur.manipal.edu' }
        });

        if (hod) {
            console.log(`Found HOD: ${hod.name} (${hod.email}), Current Role: ${hod.role}`);
            hod.role = 'hod';
            await hod.save();
            console.log(`Updated Role to: ${hod.role}`);
        } else {
            console.log('HOD User not found!');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

fixHodRole();
