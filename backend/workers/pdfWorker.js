require('dotenv').config();
const { Worker } = require('bullmq');
const { connection } = require('../services/pdfQueue');
const { Course, File, Enrollment, User } = require('../models');
const { PDFDocument, rgb } = require('pdf-lib');
const { getFileStream, s3 } = require('../utils/s3');
const { Upload } = require('@aws-sdk/lib-storage');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const { REQUIRED_FILES_THEORY, REQUIRED_FILES_LAB } = require('../utils/courseFileValidation');

const pdfWorker = new Worker('pdf-generation', async job => {
    const { courseId, userName } = job.data;
    
    await job.updateProgress(5);
    console.log(`[Worker] Started PDF generation job ${job.id} for course ${courseId}`);

    const course = await Course.findByPk(courseId);
    if (!course) throw new Error('Course not found');

    const allFiles = await File.findAll({ where: { course_id: courseId } });
    const requiredList = (course.course_type === 'lab') ? REQUIRED_FILES_LAB : REQUIRED_FILES_THEORY;

    const mergedPdf = await PDFDocument.create();
    
    // Title Page
    const titlePage = mergedPdf.addPage();
    const { width, height } = titlePage.getSize();
    titlePage.drawText(`Course File: ${course.course_code} - ${course.course_name}`, { x: 50, y: height - 100, size: 24 });
    titlePage.drawText(`Generated on: ${new Date().toLocaleDateString()}`, { x: 50, y: height - 150, size: 12 });
    titlePage.drawText(`Faculty/Coordinator: ${userName}`, { x: 50, y: height - 180, size: 12 });

    await job.updateProgress(10);
    const progressStep = 80 / requiredList.length;

    // To prevent timeout and optimize, we can download S3 files in parallel
    // but we must merge them sequentially. 
    for (const [index, requiredItem] of requiredList.entries()) {
        const itemNumber = index + 1;
        await job.updateProgress(10 + Math.floor(index * progressStep));

        // Auto-Generate Student List
        if (requiredItem.toLowerCase().includes('name list of students')) {
            const enrollments = await Enrollment.findAll({
                where: { course_id: courseId },
                include: [{ model: User, as: 'student', attributes: ['name', 'email', 'section', 'phone_number'] }],
                order: [['section', 'ASC'], [{ model: User, as: 'student' }, 'name', 'ASC']]
            });

            let currentListPage = mergedPdf.addPage();
            let y = height - 50;
            const fontSize = 10;
            const lineHeight = 15;

            currentListPage.drawText(`${itemNumber}. ${requiredItem}`, { x: 50, y, size: 14, color: rgb(0, 0, 0.8) });
            y -= 30;
            // Embed font conditionally to save performance
            const fontBold = await mergedPdf.embedFont('Helvetica-Bold');
            const fontRegular = await mergedPdf.embedFont('Helvetica');

            currentListPage.drawText('S.No', { x: 50, y, size: fontSize, font: fontBold });
            currentListPage.drawText('Name', { x: 100, y, size: fontSize, font: fontBold });
            currentListPage.drawText('Section', { x: 300, y, size: fontSize, font: fontBold });
            currentListPage.drawText('Email', { x: 380, y, size: fontSize, font: fontBold });
            y -= lineHeight * 1.5;

            enrollments.forEach((enrollment, idx) => {
                if (y < 50) {
                    currentListPage = mergedPdf.addPage();
                    y = height - 50;
                }
                const student = enrollment.student;
                currentListPage.drawText(`${idx + 1}`, { x: 50, y, size: fontSize, font: fontRegular });
                currentListPage.drawText((student?.name || 'Unknown').substring(0, 35), { x: 100, y, size: fontSize, font: fontRegular });
                currentListPage.drawText((enrollment.section || '-'), { x: 300, y, size: fontSize, font: fontRegular });
                currentListPage.drawText((student?.email || '-').substring(0, 35), { x: 380, y, size: fontSize, font: fontRegular });
                y -= lineHeight;
            });
            continue;
        }

        // Standard File Merge
        const matchedFile = allFiles.find(file => {
            const reqNormalized = requiredItem.toLowerCase().trim();
            const uploadedNormalized = (file.filename || '').toLowerCase().trim();
            return uploadedNormalized.includes(reqNormalized) || reqNormalized.includes(uploadedNormalized) || (file.file_type && reqNormalized.includes(file.file_type.replace(/_/g, ' ').toLowerCase()));
        });

        if (matchedFile) {
            try {
                let fileBuffer;
                if (process.env.AWS_BUCKET_NAME) {
                    const stream = await getFileStream(matchedFile.s3_key);
                    const chunks = [];
                    for await (const chunk of stream) chunks.push(chunk);
                    fileBuffer = Buffer.concat(chunks);
                } else {
                    const filePath = path.join(os.tmpdir(), matchedFile.s3_key);
                    await fsPromises.access(filePath);
                    fileBuffer = await fsPromises.readFile(filePath);
                }

                const ext = matchedFile.filename.split('.').pop().toLowerCase();
                if (ext === 'pdf') {
                    const pdfToMerge = await PDFDocument.load(fileBuffer);
                    const indices = pdfToMerge.getPageIndices();
                    const copiedPages = await mergedPdf.copyPages(pdfToMerge, indices);
                    copiedPages.forEach(p => mergedPdf.addPage(p));
                } else if (['jpg', 'jpeg', 'png'].includes(ext)) {
                    const imgPage = mergedPdf.addPage();
                    let embedding = ext === 'png' ? await mergedPdf.embedPng(fileBuffer) : await mergedPdf.embedJpg(fileBuffer);
                    const dims = embedding.scaleToFit(width - 40, height - 40);
                    imgPage.drawImage(embedding, {
                        x: 20, y: height - dims.height - 20, width: dims.width, height: dims.height,
                    });
                }
            } catch (err) {
                console.error(`[PDF Worker] Error merging ${matchedFile.filename}`, err);
                const errPage = mergedPdf.addPage();
                errPage.drawText(`ERROR: Could not merge ${requiredItem}.`, { x: 50, y: height - 80, size: 12, color: rgb(1, 0, 0) });
            }
        } else {
            const placeholder = mergedPdf.addPage();
            placeholder.drawText(`${itemNumber}. ${requiredItem}`, { x: 50, y: height - 50, size: 14 });
            placeholder.drawText(`(File Not Uploaded)`, { x: 50, y: height - 100, size: 12, color: rgb(0.5, 0.5, 0.5) });
        }
    }

    await job.updateProgress(90);

    const pdfBytes = await mergedPdf.save();
    const finalFilename = `generated_pdfs/${course.course_code}_${Date.now()}.pdf`;

    if (process.env.AWS_BUCKET_NAME) {
        const upload = new Upload({
            client: s3,
            params: {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: finalFilename,
                Body: Buffer.from(pdfBytes),
                ContentType: 'application/pdf',
                ContentDisposition: `attachment; filename="${course.course_code}_CourseFile.pdf"`
            }
        });
        await upload.done();
        await job.updateProgress(100);
        return { fileKey: finalFilename, isLocal: false };
    } else {
        const localPath = path.join(os.tmpdir(), finalFilename.replace('/', '_'));
        await fsPromises.writeFile(localPath, pdfBytes);
        await job.updateProgress(100);
        return { fileKey: localPath, isLocal: true };
    }
}, { connection });

console.log('[Worker] PDF Generation worker started');

// --- RENDER FREE TIER HACK ---
// Render "Web Services" require a port to be bound to consider the deployment "healthy".
// We spin up a dummy Express server here so Render doesn't kill the worker process.
const express = require('express');
const app = express();
// Use the Render-provided port in production, or 10000 locally to avoid clashing with the API on 5000
const port = process.env.RENDER ? process.env.PORT : 10000;

app.get('/', (req, res) => {
    res.send('CFMS PDF Background Worker is actively listening for jobs!');
});

app.listen(port, () => {
    console.log(`[Worker] Dummy HTTP server bound to port ${port} for Render deployment`);
});

module.exports = pdfWorker;
