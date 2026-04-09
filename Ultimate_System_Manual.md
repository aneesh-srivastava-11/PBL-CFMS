# PBL-CFMS: The Ultimate Technical Manual & System Architecture
## Comprehensive Documentation of the Course File Management System

---

### 1. Executive Summary & Project Manifesto
The **Project Based Learning - Course File Management System (PBL-CFMS)** is a high-integrity, full-stack enterprise-grade application designed for academic departments to automate the lifecycle of course documentation, student assessment, and departmental reporting. 

In a modern academic setting, compliance with accreditation standards (like NBA, NAAC, or ABET) requires the meticulous collection of over 30 distinct types of files per course per semester. Manual handling of these leads to data fragmentation, loss of version control, and immense administrative overhead. **PBL-CFMS** solves this by providing a centralized, role-based platform where every file is validated, every submission is tracked, and final reports are compiled using asynchronous background processing.

This manual serves as the definitive guide to every line of code, every service interaction, and every data model within the system.

---

### 2. Infrastructure & Environment (.env Deep Dive)

The system is designed to be environment-agnostic but requires specific cloud and database configurations to function at scale.

#### 2.1 Backend Environment Variables (`backend/.env`)
- `PORT`: Defines the entry point for the Express.js server (Default: `5000`).
- `DATABASE_URL`: A PostgreSQL connection string (Supabase URI). It uses port `6543` for session pooling, which is critical for serverless environments (like Vercel) to avoid exhausting database connection limits.
- `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY`: Credentials for AWS S3. These are used by the `@aws-sdk/client-s3` and `@aws-sdk/lib-storage` libraries to manage file streams.
- `AWS_REGION`: The physical location of the S3 bucket (e.g., `ap-south-1`).
- `AWS_BUCKET_NAME`: The identifier for the object storage container.
- `AWS_ENDPOINT`: Used for S3-compatible storage (Supabase Storage). This overrides the default AWS endpoint.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`: Credentials for the **Firebase Admin SDK**. These allow the backend to verify ID tokens, create users, and delete accounts without needing a browser-based flow.

#### 2.2 Frontend Environment Variables (`client/.env`)
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc.: Public identifiers for the Firebase Client SDK.
- `VITE_API_URL`: The gateway to the backend API.
- `VITE_ALLOWED_STUDENT_DOMAIN` & `VITE_ALLOWED_FACULTY_DOMAIN`: Security constraints that prevent unauthorized email sign-ups by enforcing university-specific domains (e.g., `@muj.manipal.edu`).

---

### 3. Backend Deep Dive: Architecture & Logic

The backend is built on **Node.js** and **Express.js**, utilizing **Sequelize ORM** for relational data mapping.

#### 3.1 The Controller Layer (Business Logic)
This is where the core algorithms of the system reside.

- **`courseController.js`**: 
    - `downloadCourseZip`: Uses the `archiver` library to create a memory-efficient ZIP stream. Instead of loading every file into RAM, it pipes S3 read streams directly into the ZIP archive.
    - `validateCourseFilesHandler`: A "Smart Validation" engine. It cross-references the `File` table against constants in `courseFileValidation.js`. It also includes "Smart Logic" to automatically mark "Student Lists" as present if the enrollment count is greater than zero, even if a physical file hasn't been uploaded yet.
    - `getCourseDashboard`: Aggregates course metadata, section instructors, file counts, and student statistics into a single JSON response for the frontend dashboard.
- **`submissionController.js`**:
    - `getSubmissionUploadUrl`: Implements the **Presigned URL** pattern. Students request a temporary, signed S3 URL to upload their files directly to the cloud. This bypasses the Express server, avoiding body-size limits (like Vercel’s 4.5MB limit) and reducing server load.
    - `gradeSubmission`: Enforces strict RBAC. Only the specific instructor assigned to a student's section (or an HOD/Admin) can apply marks.
    - `toggleFeaturedExemplar`: Allows Coordinators to "double-star" a submission. This flag tells the PDF worker to include this specific student's work as the benchmark for that course.
- **`hodController.js`**:
    - `bulkAddStudents` & `bulkAddFaculties`: Uses `exceljs` to parse `.xlsx` files. It performs domain validation, checks for database duplicates, creates a Firebase Auth account for each row, and then triggers an `autoEnrollment` utility to map students to courses based on their section.
- **`authController.js`**: Handles the internal sync between Firebase UID and MySQL user records.

#### 3.2 The Model Layer (Data Schema)
- **`User`**: Stores PII (Name, Email, Phone) and the hierarchical `role`.
- **`Course`**: The central entity. Includes `course_type` (Theory vs Lab) which determines which validation rules apply.
- **`File`**: Represents a document in S3. The `file_type` field (Syllabus, Assignment, Lesson Plan) is the key differentiator for the system’s logic.
- **`StudentSubmission`**: Links a student to an assignment file. Stores `marks`, `exemplar_type`, and `is_featured_exemplar`.
- **`CourseSection`**: A junction table mapping Instructors to specific Sections within a Course.

#### 3.3 The Middleware Chain
- **`authMiddleware.js`**: Uses an **LRU Cache** (`lru-cache`) to store verified Firebase tokens for 2 minutes. This drastically reduces the number of external calls to Firebase, improving API response times by ~100ms.
- **`errorMiddleware.js`**: Standardizes error responses into a JSON format with stack traces hidden in production.
- **`uploadMiddleware.js`**: Configures `multer` for temporary local storage before S3 offloading.

---

### 4. Background Services & Workers

#### 4.1 The PDF Generation Engine (`pdfQueue.js` & `pdfWorker.js`)
Generating a 150-page course file is a compute-intensive task that would timeout a standard HTTP request. 
- **The Queue**: Uses **BullMQ** (Redis-backed) to track generation jobs.
- **The Worker**: Runs in a separate process. It uses `pdf-lib` to:
    1. Create a dynamic title page with metadata.
    2. Auto-generate a "Student Name List" table using `Helvetica-Bold` fonts.
    3. Sequentially download and merge PDFs from S3.
    4. Convert images (PNG/JPG) into PDF pages on the fly, scaling them to fit the page dimensions.
    5. Upload the final megabyte-heavy PDF back to S3 and return a presigned download link.

#### 4.2 S3 Utility (`utils/s3.js`)
A wrapper around the AWS SDK v3. It handles `PutObjectCommand`, `GetObjectCommand`, and `GetSignedUrl`. It abstracts the underlying storage so the system can switch between AWS S3, Supabase Storage, or MinIO with zero code changes.

---

### 5. Frontend Deep Dive: User Experience & State

Built with **React (Vite)** and **Tailwind CSS**.

- **`Dashboard.jsx`**: A massive state-driven component (1400+ lines). It dynamically renders different UI modules based on the `user.role`:
    - **Students** see their enrolled courses and a "Submission Portal" for each assignment.
    - **Instructors** see their assigned sections, an "Upload Portal" with validation checks, and a "Grading Panel".
    - **HODs** see global user management and course creation tools.
- **`AuthContext.jsx`**: The "Heart" of the frontend. It listens to `onAuthStateChanged` from Firebase. When a user logs in, it immediately fetches their internal role from the backend and provides the `user` object globally.
- **Component System**:
    - `Sidebar.jsx`: Unified navigation.
    - `GradingPanel.jsx`: A specialized UI for reviewing student work side-by-side with marking inputs.
    - `CourseFileValidationModal.jsx`: A real-time "Checklist" showing progress toward 100% course file completion.

---

### 6. Critical Business Logic: "The Exemplar System"

A unique feature of PBL-CFMS is the **Quality Assurance Workflow**:
1. An **Instructor** marks a student's submission as a "Best", "Average", or "Poor" exemplar.
2. The **Coordinator** reviews these across all sections.
3. The Coordinator "Features" the best works.
4. During PDF compilation, the worker looks for these `is_featured_exemplar` flags and embeds them in the "Sample Assignments" section of the final report. This ensures that the generated Course File always represents the department's highest standards.

---

### 7. File Inventory & Purpose

| Directory | File | Purpose |
| :--- | :--- | :--- |
| `backend/` | `server.js` | Main entry point, security initialization, route mounting. |
| `backend/config/` | `db.js` | Sequelize connection pool configuration. |
| `backend/controllers/`| `courseController.js` | Core course orchestration logic. |
| `backend/controllers/`| `submissionController.js` | Student-faculty assessment interactions. |
| `backend/routes/` | `hodRoutes.js` | Protected endpoints for administrative actions. |
| `backend/workers/` | `pdfWorker.js` | Asynchronous PDF merger and generator. |
| `backend/utils/` | `s3.js` | AWS S3 connectivity layer. |
| `client/src/` | `App.jsx` | Routing and Global Provider wrapper. |
| `client/src/pages/` | `Dashboard.jsx` | The primary functional interface for all users. |
| `client/src/components/`| `Sidebar.jsx` | Dynamic navigation based on roles. |

---

### 8. Deployment and Scalability

- **API Layer**: Optimized for **Vercel** with `trust proxy` settings and serverless-friendly DB pooling.
- **Worker Layer**: Designed for **Render** or **Docker** where long-running processes are permitted.
- **Persistence**: **Supabase PostgreSQL** provides a robust, scalable relational backbone.
- **Blobs**: **AWS S3** ensures that 10GB+ of student submissions don't impact server performance.

---

### 9. Maintenance & Future Scaling
To scale to 100,000+ users:
1. Move the `pdfWorker.js` into an AWS Lambda function triggered by S3 events.
2. Implement Redis caching for the `getCourseDashboard` results.
3. Add a dedicated "Audit Log" table to track every file deletion and grade change for legal compliance.

---
*Manual compiled by Antigravity AI - 2026. This document is intended for technical review and implementation handover.*
