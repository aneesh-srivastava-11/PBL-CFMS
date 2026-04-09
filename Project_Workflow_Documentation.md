# PBL-CFMS: Project Based Learning - Course File Management System
## Technical Workflow & API Documentation

This document provides a comprehensive overview of the **PBL-CFMS** project, detailing its architecture, user roles, business workflows, and API surface.

---

### 1. System Overview
**PBL-CFMS** is a specialized Course File Management System designed to streamline the collection, organization, and validation of academic course materials and student submissions. It follows a hierarchical access model to ensure academic integrity and administrative oversight.

#### Technology Stack
- **Frontend**: React.js (Vite), Tailwind CSS, Firebase Client SDK.
- **Backend**: Node.js, Express.js, Sequelize ORM.
- **Authentication**: Firebase Admin SDK (Identity Platform).
- **Storage**: AWS S3 (Cloud Object Storage) for all documents and submissions.
- **Background Jobs**: Bull/Redis for asynchronous PDF generation/compilation.
- **Security**: Helmet, XSS-Clean, HPP (HTTP Parameter Pollution protection), and custom Role-Based Access Control (RBAC).

---

### 2. User Roles & Permissions

| Role | Description | Key Permissions |
| :--- | :--- | :--- |
| **HOD** | Department Head | Create courses, Assign Coordinators, Bulk import users, Delete users. |
| **Coordinator** | Course Lead | Manage course sections, Assign Instructors, Feature "Exemplar" work. |
| **Instructor** | Faculty Teaching a Section | Upload course materials, Create assignments, Grade submissions. |
| **Student** | Enrolled Learner | View course materials, Upload assignments, View grades. |
| **Admin** | System Overseer | All permissions + system-wide configuration. |

---

### 3. Core Workflow

#### Phase A: Administrative Setup (HOD)
1. **User Ingestion**: HOD uses `/api/hod/bulk/faculties` and `/api/hod/bulk/students` to populate the system via CSV/Excel uploads.
2. **Course Creation**: Courses are created via `/api/hod/courses`.
3. **Delegation**: HOD assigns a Senior Faculty as a **Course Coordinator** via `/api/hod/courses/:id/coordinator`.

#### Phase B: Course Organization (Coordinator)
1. **Sectioning**: Coordinators divide courses into sections (e.g., Sec A, Sec B) and assign specific **Instructors** to each section via `/api/coordinator/courses/:id/sections`.
2. **Standardization**: Coordinators oversee the "Exemplar" process to ensure grading standards.

#### Phase C: Content & Assessment (Instructor & Student)
1. **Material Upload**: Instructors upload syllabus, notes, and assignments. Files are stored in S3 and tracked in the `Files` table.
2. **Assignment Workflow**:
   - Student requests a **Presigned S3 URL** via `/api/submissions/:fileId/presigned-url` to securely upload their work.
   - Student completes the submission via `/api/submissions/:fileId`.
3. **Grading**: Instructors review S3-stored files and update grades/feedback via `/api/submissions/:id/grade`.
4. **Exemplars**: Outstanding student work is marked as an "Exemplar" by the Instructor.

#### Phase D: Reporting & Compilation
1. **Validation**: The system checks for missing mandatory files (Syllabus, Lesson Plan, etc.) via `/api/courses/:id/validate-files`.
2. **PDF Compilation**: Users trigger a background job via `/api/courses/:id/generate-pdf`. The `pdfQueue` service compiles all section files into a single departmental report, notifying the user when ready.

---

### 4. API Reference

#### Authentication (`/api/auth`)
- `POST /login`: Verify Firebase ID token and return user profile/role.
- `GET /me`: Returns current session user details.

#### HOD Management (`/api/hod`)
- `POST /courses`: Create a new course.
- `PUT /courses/:id/coordinator`: Assign a coordinator to a course.
- `GET /faculties`: List all faculty members.
- `POST /bulk/students`: Bulk upload student accounts.
- `DELETE /users/:id`: Remove a user from the system.

#### Course Operations (`/api/courses`)
- `GET /`: List all courses (filtered by user role).
- `GET /:id/dashboard`: Get completion analytics for a specific course.
- `GET /:id/file-status`: Check which mandatory files are uploaded/missing.
- `POST /:id/generate-pdf`: Start the background compilation job.

#### Submissions (`/api/submissions`)
- `POST /:fileId/presigned-url`: Get temporary S3 write access for a student.
- `GET /assignment/:fileId`: List all student submissions for an instructor.
- `PUT /:id/grade`: Apply marks and feedback to a submission.
- `PUT /:id/featured`: (Coordinator only) Mark a submission as a course-wide benchmark.

---

### 5. Future Enhancements & Suggested Changes

#### Immediate Improvements (Low Effort)
- **Email Notifications**: Integrate Nodemailer or SendGrid to alert students when a grade is posted or instructors when a deadline is approaching.
- **Deadline Enforcement**: Add a `due_date` field to the `File` (assignment) model and block submissions after the date (unless late-allowance is set).

#### Advanced Features (High Value)
- **Plagiarism Detection**: Integrate an API (like Turnitin or Copyleaks) into the `submissionController` to check student PDFs during upload.
- **AI-Powered File Validation**: Use Gemini/GPT to verify if an uploaded "Syllabus" actually contains syllabus content, preventing empty or incorrect file uploads.
- **Departmental Analytics Dashboard**: A specialized view for the HOD to see a "Heatmap" of course completion across the entire department.
