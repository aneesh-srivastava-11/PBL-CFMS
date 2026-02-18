# 🎓 PBL-CFMS: Course File Management System

A professional, robust, and user-friendly platform designed to streamline the management of academic course files. Built for **Faculty**, **HODs**, and **Students**, this system automates the tedious parts of academic record-keeping.

---

## 🌟 Key Features

### 🏢 For HODs & Admins
- **User Management**: Add faculty and students individually or in bulk via **Excel uploads**.
- **Role Control**: Assign roles (Admin, HOD, Faculty, Student) with secure permissions.
- **Faculty Tracking**: View and manage the entire faculty list and student base with ease.

### 📑 For Course Coordinators & Faculty
- **Smart PDF Generation**: Automatically merge all course materials (Handouts, Exams, Quizzes) into one professionally formatted PDF.
- **Section Mapping**: Assign different instructors to specific course sections.
- **File Management**: Organized folder-based storage (Attendance, Assignments, Exam Papers, etc.) with visibility controls.
- **Enrollment**: Manage student lists for courses via manual entry or **Bulk Excel enrollment**.

### 👨‍🎓 For Students
- **Course Dashboard**: Clean, unified view of all enrolled courses.
- **Resource Access**: Download handouts and materials shared by instructors.
- **Submissions**: Upload assignments directly to the portal (supported by secure S3/Supabase storage).

---

## 🎨 Modern UI/UX
- **Orange Theme**: A vibrant, professional color palette for a premium experience.
- **Responsive Design**: Clean layouts optimized for various screen sizes, featuring a sleek sidebar and top navigation.
- **Real-time Feedback**: Interactive forms and intuitive status updates.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React (Vite), Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, Express.js |
| **Database** | Supabase (PostgreSQL) with Sequelize ORM |
| **Authentication** | Firebase Auth (Secure Sessions) |
| **Storage** | S3-Compatible Cloud Storage (Supabase) |
| **PDF Engine** | `pdf-lib` for advanced document merging |

---

## ⚙️ Getting Started

### 1. Backend Setup
1. Navigate to the `/backend` folder.
2. Install dependencies: `npm install`.
3. Locate `.env.example`, rename it to `.env`, and fill in your credentials.
4. Locate `backend/config/serviceAccountKey.example.json`, rename it to `serviceAccountKey.json`, and replace its content with your Firebase service account key.
5. Start the server: `npm start`.

### 2. Frontend Setup
1. Navigate to the `/client` folder.
2. Install dependencies: `npm install`.
3. Locate `.env.example`, rename it to `.env`, and fill in your Firebase and API configuration.
4. Spin up the dev server: `npm run dev`.
5. Access the app at `http://localhost:5173`.

---

## 📝 Developer Notes
- **Deduplication**: Built-in backend logic ensures data integrity, even if duplicate enrollment attempts occur.
- **Cloud Ready**: Architected for easy deployment to Vercel (Frontend) and Render/Heroku (Backend).
- **Extensible**: The modular component structure makes it easy to add new document types or features.

---
