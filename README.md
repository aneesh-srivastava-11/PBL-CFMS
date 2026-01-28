# 📚 Course File Management System

Welcome! This is a robust web application designed to help Faculty and Students manage course materials, generate course files, and track enrollments easily.

It’s built with a modern tech stack, ensuring speed, security, and scalability.

---

## 🚀 Tech Stack

- **Frontend**: React (Vite) – Fast, responsive UI.
- **Backend**: Node.js & Express – Secure API server.
- **Database**: Supabase (PostgreSQL) – Reliable cloud data storage.
- **File Storage**: Supabase Storage (S3 Compatible) – Cloud hosting for PDFs and images.
- **Authentication**: Firebase Auth – Secure Google/email login.

---

## 🛠️ Prerequisites

Before you start, make sure you have:
1.  **Node.js** installed on your computer.
2.  A **Supabase** account (Free tier is perfect).
3.  A **Firebase** project for authentication.

---

## ⚡ Quick Start Guide

### 1. Backend Setup (The Brain)

Navigate to the backend folder and install the necessary tools.

```bash
cd backend
npm install
```

**Configuration (.env):**
Create a `.env` file in the `backend/` folder. You can copy the structure below. You'll need credentials from your Supabase dashboard.

```env
PORT=5000

# 1. Database URL (From Supabase -> Settings -> Database -> Connection String)
# IMPORTANT: Use port 6543 (Session Pooler) if on IPv4 network!
DATABASE_URL="postgres://[USER]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# 2. Storage Keys (From Supabase -> Settings -> Storage -> S3 Compatibility)
AWS_ACCESS_KEY_ID="[YOUR_ACCESS_KEY]"
AWS_SECRET_ACCESS_KEY="[YOUR_SECRET_KEY]"
AWS_REGION="[YOUR_REGION]" (e.g., us-east-1)
AWS_BUCKET_NAME="uploads"
AWS_ENDPOINT="[YOUR_ENDPOINT_URL]"
```

**Start the Server:**
```bash
npm start
```
*You should see "Server running on port 5000" and "Database Synced".*

### 2. Frontend Setup (The Face)

Open a new terminal, go to the client folder, and launch the UI.

```bash
cd client
npm install
npm run dev
```
*The app will open at `http://localhost:5173`. Login and enjoy!*

---

## 🌟 Key Features

- **For Faculty**:
    - Create Courses.
    - Upload Exam Papers, Assignments, QPs, etc.
    - **One-Click Course File**: Automatically merges all uploaded PDFs and Images into a single, organized Course File PDF.
- **For Students**:
    - View enrolled courses.
    - Download materials shared by faculty.
- **Security**:
    - Role-based access (Faculty vs Student).
    - Rate limiting protection.
    - Secure cloud storage.

---

## 📝 Notes for Developers

- **Database**: We use **Sequelize** (ORM). You don't need to write SQL manually. The tables are created automatically when the server starts.
- **Deployment**: This app is "Cloud Ready". You can deploy the backend to Render/Heroku and the frontend to Vercel/Netlify without changing code (just set the Env Vars!).
