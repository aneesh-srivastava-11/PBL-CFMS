const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const File = require('./models/fileModel');
const Course = require('./models/courseModel');
require('./models'); // Init associations

const checkFiles = async () => {
    try {
        console.log('Checking Files...');
        const courses = await Course.findAll();
        for (const course of courses) {
            console.log(`\nCourse: ${course.course_code} (ID: ${course.id})`);
            const files = await File.findAll({ where: { course_id: course.id } });

            if (files.length === 0) {
                console.log(' - No files uploaded.');
                continue;
            }

            for (const file of files) {
                const filePath = path.join(__dirname, 'uploads', file.s3_key);
                const exists = fs.existsSync(filePath);
                const isPdf = file.filename.toLowerCase().endsWith('.pdf');

                console.log(` - File: ${file.filename} (Type: ${file.file_type})`);
                console.log(`   - Is PDF? ${isPdf}`);
                console.log(`   - Exists on Disk? ${exists} (${filePath})`);

                if (!isPdf) console.warn('   ! SKIPPED during merge (Not PDF)');
                if (!exists) console.error('   ! MISSING on disk');
            }
        }
    } catch (error) {
        console.error(error);
    }
};

checkFiles().then(() => process.exit());
