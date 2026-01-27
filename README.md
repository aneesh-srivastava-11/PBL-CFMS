# Course File Management System

## Prerequisites
- Node.js installed
- MySQL Server running
- AWS S3 Bucket (optional, for file uploads)

## Setup & Running

### 1. Database Setup
1. Open your MySQL client (Workbench, CLI, etc.).
2. Run the SQL script located at `backend/schema.sql`.

### 2. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `.env`:
   - Open `.env` and fill in your DB credentials (DB_PASSWORD) and AWS keys.
4. Start the server:
   ```bash
   npm run dev
   ```
   Server will run on `http://localhost:5000`.

### 3. Frontend Setup
1. Navigate to the client folder:
   ```bash
   cd client
   ```
2. Install dependencies (if not done):
   ```bash
   npm install
   ```
3. Start the Vite server:
   ```bash
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`.

## Deployment
- Use the Linux scripts in `scripts/` for backup and course file generation (Requires Bash/WSL on Windows).
