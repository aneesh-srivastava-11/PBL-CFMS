require('dotenv').config();
const { Worker } = require('bullmq');
const { connection } = require('../services/pdfQueue');
const { Course, File, Enrollment, User } = require('../models');
const { PDFDocument, rgb } = require('pdf-lib');
const { getFileStream, s3 } = require('../utils/s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const { REQUIRED_FILES_THEORY, REQUIRED_FILES_LAB } = require('../utils/courseFileValidation');

const pdfWorker = new Worker('pdf-generation', async job => {
    const startTime = Date.now();
    const { courseId, userName } = job.data;
    
    await job.updateProgress(5);
    console.log(`[Worker] Started PDF generation job ${job.id} for course ${courseId}`);

    const course = await Course.findByPk(courseId);
    if (!course) throw new Error('Course not found');

    const allFiles = await File.findAll({ where: { course_id: courseId } });
    const requiredList = (course.course_type === 'lab') ? REQUIRED_FILES_LAB : REQUIRED_FILES_THEORY;

    console.log(`[Worker] DB queries done in ${Date.now() - startTime}ms`);

    const mergedPdf = await PDFDocument.create();
    
    // Title Page
    const titlePage = mergedPdf.addPage();
    const { width, height } = titlePage.getSize();
    titlePage.drawText(`Course File: ${course.course_code} - ${course.course_name}`, { x: 50, y: height - 100, size: 24 });
    titlePage.drawText(`Generated on: ${new Date().toLocaleDateString()}`, { x: 50, y: height - 150, size: 12 });
    titlePage.drawText(`Faculty/Coordinator: ${userName}`, { x: 50, y: height - 180, size: 12 });

    await job.updateProgress(10);

    // PRE-FETCH: Download all matched S3 files in parallel BEFORE the loop
    const prefetchStart = Date.now();
    const fileBufferMap = new Map();
    
    if (process.env.AWS_BUCKET_NAME) {
        const filesToFetch = allFiles.filter(f => f.s3_key);
        const fetchPromises = filesToFetch.map(async (file) => {
            try {
                const stream = await getFileStream(file.s3_key);
                const chunks = [];
                for await (const chunk of stream) chunks.push(chunk);
                fileBufferMap.set(file.id, Buffer.concat(chunks));
            } catch (err) {
                console.error(`[Worker] Failed to prefetch ${file.filename}:`, err.message);
            }
        });
        await Promise.all(fetchPromises);
    } else {
        // Local storage
        for (const file of allFiles) {
            try {
                const filePath = path.join(os.tmpdir(), file.s3_key);
                await fsPromises.access(filePath);
                fileBufferMap.set(file.id, await fsPromises.readFile(filePath));
            } catch (err) { /* skip missing */ }
        }
    }
    console.log(`[Worker] Prefetched ${fileBufferMap.size} files in ${Date.now() - prefetchStart}ms`);

    await job.updateProgress(40);

    // Process all required items (now using prefetched buffers - no more S3 calls)
    const processStart = Date.now();
    for (const [index, requiredItem] of requiredList.entries()) {
        const itemNumber = index + 1;

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

        // Standard File Merge (using prefetched buffers)
        const matchedFile = allFiles.find(file => {
            const reqNormalized = requiredItem.toLowerCase().trim();
            const uploadedNormalized = (file.filename || '').toLowerCase().trim();
            return uploadedNormalized.includes(reqNormalized) || reqNormalized.includes(uploadedNormalized) || (file.file_type && reqNormalized.includes(file.file_type.replace(/_/g, ' ').toLowerCase()));
        });

        if (matchedFile && fileBufferMap.has(matchedFile.id)) {
            try {
                const fileBuffer = fileBufferMap.get(matchedFile.id);
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
    console.log(`[Worker] PDF assembly done in ${Date.now() - processStart}ms`);

    await job.updateProgress(80);

    const pdfBytes = await mergedPdf.save();
    const finalFilename = `generated_pdfs/${course.course_code}_${Date.now()}.pdf`;

    const uploadStart = Date.now();
    if (process.env.AWS_BUCKET_NAME) {
        // Use simple PutObject for small-medium PDFs (faster than multipart Upload)
        const pdfBuffer = Buffer.from(pdfBytes);
        if (pdfBuffer.length < 50 * 1024 * 1024) { // < 50MB: use simple put
            await s3.send(new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: finalFilename,
                Body: pdfBuffer,
                ContentType: 'application/pdf',
                ContentDisposition: `attachment; filename="${course.course_code}_CourseFile.pdf"`
            }));
        } else {
            // Large file: use multipart upload
            const upload = new Upload({
                client: s3,
                params: {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: finalFilename,
                    Body: pdfBuffer,
                    ContentType: 'application/pdf',
                    ContentDisposition: `attachment; filename="${course.course_code}_CourseFile.pdf"`
                }
            });
            await upload.done();
        }
        console.log(`[Worker] S3 upload done in ${Date.now() - uploadStart}ms`);
        await job.updateProgress(100);
        console.log(`[Worker] TOTAL TIME: ${Date.now() - startTime}ms`);
        return { fileKey: finalFilename, isLocal: false };
    } else {
        const localPath = path.join(os.tmpdir(), finalFilename.replace('/', '_'));
        await fsPromises.writeFile(localPath, pdfBytes);
        await job.updateProgress(100);
        console.log(`[Worker] TOTAL TIME: ${Date.now() - startTime}ms`);
        return { fileKey: localPath, isLocal: true };
    }
}, { connection });

console.log('[Worker] PDF Generation worker started');

// --- RENDER FREE TIER HACK ---
const express = require('express');
const app = express();
const port = process.env.RENDER ? process.env.PORT : 10000;

app.get('/', (req, res) => {
    res.send('CFMS PDF Background Worker is actively listening for jobs!');
});

app.listen(port, () => {
    console.log(`[Worker] Dummy HTTP server bound to port ${port} for Render deployment`);
});

module.exports = pdfWorker;
