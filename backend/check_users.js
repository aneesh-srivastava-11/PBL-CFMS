const { User } = require('./models');
const sequelize = require('./config/db');

async function checkUsers() {
    try {
        const users = await User.findAll();
        console.log(`Total Users: ${users.length}`);

        const byRole = {};
        users.forEach(u => {
            byRole[u.role] = (byRole[u.role] || 0) + 1;
        });
        console.log('Counts by Role:', byRole);

        console.log('\n--- Faculty List ---');
        users.filter(u => u.role === 'faculty').forEach(u => console.log(`- ${u.name} (${u.email})`));

        console.log('\n--- Student List ---');
        users.filter(u => u.role === 'student').forEach(u => console.log(`- ${u.name} (${u.email})`));

        console.log('\n--- Others ---');
        users.filter(u => !['faculty', 'student'].includes(u.role)).forEach(u => console.log(`- ${u.name} (${u.email}) [Role: ${u.role}]`));

    } catch (error) {
        console.error('Error:', error);
    }
}

checkUsers();
