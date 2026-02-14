const { CourseSection, User, Course } = require('./models');

async function debugAssignments() {
    try {
        console.log('Fetching all Course Assignments...');
        const assignments = await CourseSection.findAll({
            include: [
                { model: User, as: 'instructor', attributes: ['id', 'name', 'email'] },
                { model: Course, as: 'course', attributes: ['id', 'course_code'] }
            ]
        });

        console.log(`Found ${assignments.length} assignments.`);
        assignments.forEach(a => {
            console.log(`- Instructor: ${a.instructor?.name} (${a.instructor?.email}) | Course: ${a.course?.course_code} | Section: ${a.section}`);
        });

    } catch (error) {
        console.error('Error fetching assignments:', error);
    }
}

debugAssignments();
