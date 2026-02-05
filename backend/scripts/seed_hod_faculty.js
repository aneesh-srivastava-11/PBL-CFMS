const { User } = require('../models');

const seedUsers = async () => {
    try {
        // Ensure connection
        await User.sequelize.authenticate();
        console.log('Database connected.');

        // HOD
        const hodData = {
            name: 'HOD Computer Science',
            email: 'hod.cs@jaipur.manipal.edu',
            role: 'hod',
            password: 'password123',
            phone_number: '1234567890',
            firebase_uid: 'hod-mock-uid'
        };

        // Faculties
        const facultyData = [
            { name: 'Dr. Alice Smith', email: 'alice.smith@jaipur.manipal.edu', role: 'faculty', phone_number: '9876543210', firebase_uid: 'fac1-mock-uid' },
            { name: 'Dr. Bob Jones', email: 'bob.jones@jaipur.manipal.edu', role: 'faculty', phone_number: '9876543211', firebase_uid: 'fac2-mock-uid' },
            { name: 'Dr. Charlie Brown', email: 'charlie.brown@jaipur.manipal.edu', role: 'faculty', phone_number: '9876543212', firebase_uid: 'fac3-mock-uid' },
            { name: 'Dr. Diana Prince', email: 'diana.prince@jaipur.manipal.edu', role: 'faculty', phone_number: '9876543213', firebase_uid: 'fac4-mock-uid' }
        ];

        // 1. Create or Update HOD
        const [hod, createdHod] = await User.findOrCreate({
            where: { email: hodData.email },
            defaults: hodData
        });
        console.log(`HOD: ${hod.name} (ID: ${hod.id}) - ${createdHod ? 'Created' : 'Existed'}`);

        // 2. Create or Update Faculties
        console.log('\nFaculties:');
        for (const fac of facultyData) {
            const [user, created] = await User.findOrCreate({
                where: { email: fac.email },
                defaults: { ...fac, password: 'password123' }
            });
            console.log(`- ${user.name} (ID: ${user.id}) - ${created ? 'Created' : 'Existed'}`);
        }

        console.log('\nSeed completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
};

seedUsers();
