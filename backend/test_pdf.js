const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const Course = require('./models/courseModel');
const File = require('./models/fileModel');
const User = require('./models/userModel'); // Needed for associations
require('./models'); // Init associations

const generateTestPDF = async (courseId) => {
    try {
        console.log(`Testing PDF Generation for Course ID: ${courseId}`);

        const course = await Course.findByPk(courseId);
        if (!course) {
            console.error('Course not found');
            return;
        }
        console.log(`Course Found: ${course.course_code}`);

        const allFiles = await File.findAll({ where: { course_id: courseId } });
        console.log(`Total Files: ${allFiles.length}`);

        const pdfFiles = allFiles.filter(f => f.filename.toLowerCase().endsWith('.pdf'));
        console.log(`PDF Files: ${pdfFiles.length}`);

        const mergedPdf = await PDFDocument.create();
        const page = mergedPdf.addPage();
        page.drawText(`TEST FILE: ${course.course_code}`, { x: 50, y: 700, size: 30 });

        for (const file of pdfFiles) {
            try {
                const filePath = path.join(__dirname, 'uploads', file.s3_key);
                console.log(`Processing: ${file.filename} -> ${filePath}`);

                if (fs.existsSync(filePath)) {
                    const fileBuffer = fs.readFileSync(filePath);
                    const srcPdf = await PDFDocument.load(fileBuffer);
                    const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
                    copiedPages.forEach(p => mergedPdf.addPage(p));
                    console.log(` - Merged: ${file.filename}`);
                } else {
                    console.error(` - File MISSING on disk: ${filePath}`);
                }
            } catch (err) {
                console.error(` - Error merging ${file.filename}:`, err.message);
            }
        }

        const pdfBytes = await mergedPdf.save();
        fs.writeFileSync('test_output.pdf', pdfBytes);
        console.log('SUCCESS: test_output.pdf created.');

    } catch (error) {
        console.error('CRITICAL FAILURE:', error);
    }
};

// Run it
generateTestPDF(1).then(() => process.exit());
