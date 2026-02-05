const { CourseSection, User, Enrollment } = require('../models');

async function fixEnrollments() {
    console.log('Starting Manual Enrollment Fix...');

    try {
        const sections = await CourseSection.findAll();
        console.log(`Found ${sections.length} course sections.`);

        for (const sec of sections) {
            const courseId = sec.course_id;
            const sectionName = sec.section; // e.g. "I"

            if (!sectionName) continue;

            const targetSection = sectionName.trim().toLowerCase();
            console.log(`Checking Section '${sectionName}' (Course ${courseId})...`);

            const allStudents = await User.findAll({ where: { role: 'student' } });
            const matchingStudents = allStudents.filter(s =>
                s.section && s.section.trim().toLowerCase() === targetSection
            );

            console.log(`  - Found ${matchingStudents.length} students in section '${sectionName}'.`);

            for (const student of matchingStudents) {
                const [enrollment, created] = await Enrollment.findOrCreate({
                    where: {
                        student_id: student.id,
                        course_id: courseId
                    },
                    defaults: {
                        student_id: student.id,
                        course_id: courseId,
                        section: sectionName
                    }
                });
                if (created) {
                    console.log(`  - Enrollment created for ${student.name} (${student.email})`);
                }
            }
        }
        console.log('Fix Complete.');
    } catch (error) {
        console.error('Error:', error);
    }
}

fixEnrollments();
