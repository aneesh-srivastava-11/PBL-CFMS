const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Course, User, Enrollment } = require('./models');
const sequelize = require('./config/db');

const debug = async () => {
    try {
        await sequelize.authenticate();
        console.log('DB Connected.');

        // 1. Count Total Enrollments
        const count = await Enrollment.count();
        console.log(`Total Enrollments in DB: ${count}`);

        // 2. Fetch All Enrollments Raw
        const all = await Enrollment.findAll();
        console.log('All Enrollments:', JSON.stringify(all, null, 2));

        // 3. Fetch Courses with Students
        const courses = await Course.findAll({
            include: [{
                model: User,
                as: 'students',
                attributes: ['id', 'email']
            }]
        });

        console.log('Courses with Students:');
        courses.forEach(c => {
            console.log(`Course: ${c.course_code} (${c.id}) - Students: ${c.students.length}`);
            c.students.forEach(s => console.log(` - ${s.email}`));
        });

    } catch (error) {
        console.error('Debug Error:', error);
    } finally {
        process.exit();
    }
};

debug();
