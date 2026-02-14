const { User } = require('./models');

async function checkUserRole() {
    try {
        console.log('Searching for users with "jones"...');
        const users = await User.findAll({
            where: {
                email: {
                    [require('sequelize').Op.like]: '%jones%'
                }
            }
        });

        if (users.length === 0) {
            console.log('No user found!');
        } else {
            users.forEach(u => {
                console.log(`ID: ${u.id} | Name: ${u.name} | Email: ${u.email} | Role: '${u.role}'`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkUserRole();
