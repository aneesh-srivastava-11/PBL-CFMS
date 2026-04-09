# PBL-CFMS: The Masterpiece Technical Manual
## A Complete, Line-by-Line Guide to the Course File Management System

---

### SECTION 1: THE BIG PICTURE
#### What is this project?
Imagine a university department. Every semester, professors (Instructors) teach courses. For every course, they must collect a "Course File"—a massive binder containing the syllabus, lesson plans, student attendance, assignments, and sample student work (exemplars). 

Manually collecting these for 100+ courses is a nightmare. **PBL-CFMS** is a digital "Super-Industrial Machine" that automates this. It allows:
1. **Administrators (HOD)** to set up the farm (create courses, students, and faculty).
2. **Coordinators** to oversight specific crops (manage course-wide files).
3. **Instructors** to plant and harvest (upload files, grade students).
4. **Students** to turn in their produce (submit assignments).
5. **The Machine** to automatically package everything into a single, beautiful PDF report at the end.

#### The Architecture: How the "Buildings" Connect
Our project is split into two main "Buildings":
1. **The Client (Frontend)**: This is the **User Interface**. It's the "Front Office" where users click buttons, see lists, and type data. It's built with **React**.
2. **The Server (Backend)**: This is the **Processing Plant**. It's the "Back Office" that stores data, generates PDFs, and talks to the database. It's built with **Node.js** and **Express**.

#### The Communication: Request → Response Flow
When you click a button in the Front Office, a **Request** is sent to the Back Office.
1. **Route**: The front door of the office. It looks at the label on the request (e.g., "Give me Course A") and sends it to the right desk.
2. **Middleware**: The security guard. It checks if you have the right ID badge before letting you to the desk.
3. **Controller**: The clerk at the desk. They read the request, figure out what to do, and talk to the "File Cabinet" (Database).
4. **Database**: The storage room where everything is permanently recorded.
5. **Response**: The clerk brings the answer back to the front door, and the messenger takes it back to the Front Office to show you.

---

### SECTION 2: THE FOLDER STRUCTURE (The Map)

#### 📂 `backend/` (The Brain)
- **`config/`**: Contains the "Settings" for connecting to the database.
- **`controllers/`**: The "Logic Desks" where requests are handled.
- **`middleware/`**: The "Checkpoints" for security and validation.
- **`models/`**: The "Blueprints" or "Templates" for our data (Users, Courses, Files).
- **`routes/`**: The "Mailing System" that directs traffic to controllers.
- **`services/`**: External helpers (Firebase, S3).
- **`utils/`**: Internal tools (Logging, calculation logic).
- **`workers/`**: Heavy machinery for background tasks (PDF generation).

#### 📂 `client/` (The Face)
- **`src/assets/`**: Images, logos, and styling.
- **`src/components/`**: Smaller, reusable UI pieces (Buttons, Sidebars).
- **`src/context/`**: The "Global Memory" that remembers who is logged in across the whole app.
- **`src/pages/`**: The main screens you see (Dashboard, Login).

---

### SECTION 3: FUNDAMENTAL CONCEPTS
Before we read the code, you must know these five things:
1. **API (Application Programming Interface)**: A way for two computers to talk. It's like a menu in a restaurant—you pick an item (Request), and the kitchen (Server) prepares it.
2. **Async / Await**: In real life, some tasks take time (like waiting for a pizza). Instead of stopping everything, we say "Await the pizza." This let's the waiter do other things until the pizza is ready.
3. **Middleware**: Functions that run "in the middle" of a request and a response.
4. **ORM (Sequelize)**: A tool that let's us talk to the database with JavaScript instead of complex database-language (SQL).
5. **React Hooks (`useState`, `useEffect`)**:
   - `useState`: Remembers a value (like a counter).
   - `useEffect`: Triggers an action when something changes (like "load data when the page opens").

---
### SECTION 4: BACKEND FILE-BY-FILE BREAKDOWN

#### 📂 `backend/server.js` (The Entry Point)
This file is the "Main Switch" for our system. It starts the server and connects all the parts.

**Line-by-Line Analysis:**
1. `const express = require('express');`
   - **What**: Imports the Express framework.
   - **Why**: Express is the foundation of our backend; it handles routes and requests.

2. `const dotenv = require('dotenv');`
   - **What**: Imports the `dotenv` library.
   - **Why**: Allows us to read "Secrets" (API keys) from the `.env` file.

3. `const helmet = require('helmet');`
   - **What**: Imports a security library.
   - **Why**: Adds "Armor" to our server by hiding sensitive information in the headers of our replies.

4. `const cors = require('cors');`
   - **What**: Imports "Cross-Origin Resource Sharing."
   - **Why**: Tells the server that it’s okay for our React application (on another address) to talk to it.

5. `const { notFound, errorHandler } = require('./middleware/errorMiddleware');`
   - **What**: Imports our custom error-handling guards.
   - **Why**: To ensure that if something breaks, the user gets a clean error message, not a crash.

6. `const sequelize = require('./config/db');`
   - **What**: Imports our database connection.
   - **Why**: The server can't talk to the storage room without this connection.

7. `dotenv.config();`
   - **What**: Runs the dotenv tool.
   - **Why**: Actually loads the secrets so we can use them later in the file.

8. `const app = express();`
   - **What**: Creates the "App Instance."
   - **Why**: This is the "Office Building" itself. All "hallways" (routes) will be attached to this `app`.

9. `app.use(helmet());`
   - **What**: Puts on the safety armor.
   - **Why**: Protects against common internet attacks like "Cross-Site Scripting."

10. `app.use(cors());`
    - **What**: Policy for who can talk to us. 
    - **Why**: Without this, the website would blocked from talking to the server for security reasons.

11. `app.use(express.json());`
    - **What**: The "Parcel Opener."
    - **Why**: Requests come in as "Strings" (unstructured text). This middleware turns them into "JSON Objects" (neatly labeled data) so we can read them easily.

12. `app.use('/api/auth', require('./routes/authRoutes'));`
    - **What**: Attaches the "Auth Hallway."
    - **Why**: Tells the office: "If a request starts with /api/auth, send it to the Auth department."

13. `app.use(notFound);`
    - **What**: The "Dead End" sign.
    - **Why**: If a request doesn't match any departments above, this middleware catches it and says "404 Not Found."

14. `app.use(errorHandler);`
    - **What**: The "Hospital."
    - **Why**: If any department crashes, this middleware catches the error and sends a clean message back to the user.

15. `const PORT = process.env.PORT || 5000;`
    - **What**: Sets the "Building Number" (The Port).
    - **Why**: Allows us to change the port if 5000 is already taken.

16. `sequelize.authenticate().then(() => { ... });`
    - **What**: Connects to the database and starts the building.
    - **Why**: We only start the office *after* we know the storage room is open and ready.

---

#### 📂 `backend/models/index.js` (The Database Blueprint)
This file is the "Master Registry" for all our data tables. It tells the system how different tables relate to each other (e.g., "A course has many students").

**Line-by-Line Analysis:**
1. `const User = require('./User');`
   - **What**: Imports the User blueprint.
   - **Why**: To define how user data looks.

2. `User.hasMany(Enrollment, { foreignKey: 'student_id' });`
   - **What**: Defines a "One-to-Many" relationship.
   - **Why**: Tells the ledger: "One student can be enrolled in many different courses."

3. `Enrollment.belongsTo(User, { foreignKey: 'student_id' });`
   - **What**: The reverse relationship.
   - **Why**: Tells the ledger: "Every enrollment record belongs to exactly one student."

4. `Course.hasMany(File, { foreignKey: 'course_id' });`
   - **What**: Relationship between Courses and Files.
   - **Why**: A course folder (Course) contains many papers (Files).

**Why this matters:**
Without this file, the database would just be a collection of disconnected lists. These "Associations" are what turn our lists into a **System**. If you removed line 2, you could still add students and courses, but you would never be able to tell which student is in which course.

---
#### 📂 `backend/routes/authRoutes.js` (The Security Entrance)
This file defines the doors that users can walk through to identify themselves.

**Line-by-Line Analysis:**
1. `const express = require('express');`
   - **What**: Imports Express.
   - **Why**: To create the "Router" object.

2. `const router = express.Router();`
   - **What**: Creates a mini-app for authentication.
   - **Why**: It keeps the `server.js` file clean. Instead of 100 lines in one file, we have 10 lines in 10 files.

3. `const { loginSync } = require('../controllers/authController');`
   - **What**: Imports the "Login Clerk" logic.
   - **Why**: The route handles the *address*, the controller handles the *work*.

4. `const { protect } = require('../middleware/authMiddleware');`
   - **What**: Imports the "ID Badge Checker."
   - **Why**: To ensure that only authorized people can access certain doors.

5. `router.post('/login-sync', protect, loginSync);`
   - **What**: Defines the "Login Sync" door.
   - **Why**: 
     - **POST**: We use POST because we are sending sensitive info.
     - **'/login-sync'**: The label on the door.
     - **protect**: First, the guard checks the ID.
     - **loginSync**: Then, the clerk does the work.

---

#### 📂 `backend/controllers/authController.js` (The Login Ledger Logic)
This is where we sync our local ledger with the global Guard (Firebase).

**Line-by-Line Analysis:**
1. `const loginSync = asyncHandler(async (req, res) => { ... });`
   - **What**: Defines the main task.
   - **Why**: `asyncHandler` makes sure that if the clerk trips (an error occurs), the "Hospital" (errorHandler) catches them.

2. `const { uid, email, name: firebaseName, picture } = req.user;`
   - **What**: Extracts user info from the request.
   - **Why**: The "Guard" (authMiddleware) already checked the ID and put the info into `req.user`. Now we use it.

3. `let user = await User.findOne({ where: { uid } });`
   - **What**: Looks in our local ledger for this person.
   - **Why**: We need to know if they have visited our farm before.

4. `if (!user) { user = await User.create({ ... }); }`
   - **What**: Creates a new record if they are new.
   - **Why**: If it’s their first time, we give them a spot in our ledger.

5. `res.status(200).json(user);`
   - **What**: Sends the user's info back to the storefront.
   - **Why**: So the React app knows who is logged in and what their role is.

**Teaching Moment: What is "Role-Based Access Control" (RBAC)?**
This project uses roles: `HOD`, `COORDINATOR`, `INSTRUCTOR`, `STUDENT`. 
In the controller, we check these roles. It's like having a master key:
- An **HOD** key opens every door.
- A **Student** key only opens the "Submission" door.
This is the most important security feature of the project!

---
#### 📂 `backend/controllers/courseController.js` (The Course Orchestrator)
This is the most complex file. It manages the lifecycle of a course.

**Line-by-Line Analysis (Important Functions):**
1. `const getCourseDashboard = asyncHandler(async (req, res) => { ... });`
   - **What**: The main function for the Dashboard.
   - **Why**: It gathers everything (Metadata, Faculty, Stats) into one response.

2. `const course = await Course.findByPk(courseId, { ... });`
   - **What**: Fetches the course by its Primary Key (ID).
   - **Why**: We need the base info for the course before we can find its files or students.

3. `const fileStats = await File.count({ where: { course_id: courseId } });`
   - **What**: Counts how many files have been uploaded.
   - **Why**: To show the "Completion Percentage" on the dashboard.

**Teaching Moment: What is `include` in Sequelize?**
You will see `include: [{ model: User }]`. This is called a **Join**. 
Imagine the Course ledger has a list of Student IDs (numbers). `include` tells the clerk: "Don't just give me the numbers; go to the User ledger, find the names for these IDs, and bring them back too."

---

#### 📂 `backend/controllers/submissionController.js` (The Student Work Desk)
This file handles how student work is uploaded and graded.

**Line-by-Line Analysis:**
1. `const getSubmissionUploadUrl = asyncHandler(async (req, res) => { ... });`
   - **What**: The "Presigned URL" generator.
   - **Why**:
     - **Line X**: `const key = `submissions/${courseId}/${assignmentType}/${studentUid}-${fileName}`;`
       - Creates a unique "Shelf Address" in the warehouse.
     - **Line Y**: `const url = await getSignedUrl(s3, new PutObjectCommand({ ... }), { expiresIn: 900 });`
       - Asks the warehouse for a 15-minute key.
       - If this fails, the student can't upload.

2. `const gradeSubmission = asyncHandler(async (req, res) => { ... });`
   - **What**: The grading function.
   - **Why**:
     - `const { marks, comments } = req.body;`
       - Takes the grade from the instructor's input.
     - `await submission.update({ marks, graded_by: req.user.id });`
       - Records the grade and *who* gave it.

**Teaching Moment: Why "Presigned URLs"?**
Normally, a file goes `Student → Server → S3`. But if 1,000 students upload at once, the Server will explode.
With **Presigned URLs**, it goes `Student → S3`. The Server just watches and says "Yes, you have permission." This is how professional, high-scale apps like Netflix or Google Drive work!

---
#### 📂 `backend/workers/pdfWorker.js` (The PDF Factory)
This file is like a robot in the back of the farm that staples together thousands of pages into one book.

**Line-by-Line Analysis:**
1. `const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');`
   - **What**: Imports the "Bookmaking Tools."
   - **Why**: `pdf-lib` allows us to create new pages and merge existing ones.

2. `const pdfDoc = await PDFDocument.create();`
   - **What**: Starts a new blank book.
   - **Why**: This will be our final Course File.

3. `for (const file of files) { ... }`
   - **What**: A loop that goes through every file in the course.
   - **Why**: We need to fetch each part (Syllabus, Assignments) one by one.

4. `const response = await s3.send(new GetObjectCommand({ ... }));`
   - **What**: Fetches a file from the sky warehouse (S3).
   - **Why**: We can't merge a file until we've downloaded it.

**Teaching Moment: What is a "Worker"?**
If you try to merge 50 PDFs in the main office, no one else can talk to the Clerk (Server) while she's busy.
A **Worker** is a separate employee in a separate building. The Clerk just shouts: "Hey Worker, make this PDF!" and then goes back to answering the phone. This is how we keep the website fast!

---

#### 📂 `backend/utils/autoEnrollment.js` (The Automated Farmhand)
This tool automatically puts students into the right fields (Courses) based on their Section (A or B).

**Line-by-Line Analysis:**
1. `const courseSections = await CourseSection.findAll({ where: { section } });`
   - **What**: Finds all courses that belong to the student's section.
   - **Why**: A student in Section A should only be in Section A courses.

2. `await Enrollment.findOrCreate({ where: { student_id, course_id } });`
   - **What**: Puts the student in the course ledger if they aren't already there.
   - **Why**: "findOrCreate" is a safe tool—it prevents us from writing the same student's name twice in the same book.

---

#### 📂 `backend/utils/s3.js` (The Warehouse Connector)
This file is the "Radio" we use to talk to the Cloud Warehouse (S3).

**Line-by-Line Analysis:**
1. `const s3 = new S3Client({ region, credentials, ... });`
   - **What**: Setups the radio with the right frequency (Region) and password (Credentials).
   - **Why**: Without the right frequency, the Warehouse won't hear us.

2. `module.exports = s3;`
   - **What**: Makes the radio available to all other files.
   - **Why**: Any file (Controller, Worker) that needs a file from S3 can just borrow this radio.

---
### SECTION 5: FRONTEND DEEP DIVE

#### 📂 `client/src/App.jsx` (The Map of the Storefront)
This file defines which "Room" (Page) the user sees depending on the address in their browser.

**Line-by-Line Analysis:**
1. `import { BrowserRouter, Routes, Route } from 'react-router-dom';`
   - **What**: Imports the "Signpost" tools.
   - **Why**: React Router is what lets us have multiple pages (`/dashboard`, `/login`) in a single app.

2. `<AuthProvider>`
   - **What**: Wraps the whole app in the Global Memory.
   - **Why**: This ensures that *every* page knows who is logged in.

3. `<Route path="/login" element={<Login />} />`
   - **What**: Tells the browser: "If the user goes to /login, show the Login screen."

4. `<Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />`
   - **What**: The "Guard" for the dashboard.
   - **Why**: `ProtectedRoute` checks if the user is logged in. If not, it kicks them back to the Login screen.

---

#### 📂 `client/src/context/AuthContext.jsx` (The Global Brain)
This is the most important part of the frontend. It remembers the user even if they refresh the page.

**Line-by-Line Analysis:**
1. `export const AuthContext = createContext();`
   - **What**: Creates a "Cloud" of data.
   - **Why**: Any component in the app can reach up into this cloud to get user info.

2. `const [user, setUser] = useState(null);`
   - **What**: The memory slot for the user.
   - **Why**: When the app starts, we don't know who the user is (`null`).

3. `useEffect(() => { ... }, []);`
   - **What**: The "Wake Up" routine.
   - **Why**: When you open the website, this code runs first. It checks the "Cookie Jar" (LocalStorage) to see if you were logged in last time.

4. `const login = async (token) => { ... }`
   - **What**: The login messenger.
   - **Why**: It takes the ID from Firebase, sends it to our Backend Clerk, and gets back our local user data.

**Teaching Moment: What is "State"?**
In React, "State" is like a chalkboard. When the user logs in, we write their name on the chalkboard (`setUser`). React sees the change and automatically redraws the whole page to show their name!

---
#### 📂 `client/src/pages/Dashboard.jsx` (The Main Control Room)
This is the largest file in the frontend. It changes its entire layout based on who is looking at it.

**Line-by-Line Analysis (Key Logic):**
1. `const { user } = useContext(AuthContext);`
   - **What**: Reaches into the Global Memory Cloud.
   - **Why**: The Dashboard needs to know if you are a "Student" or an "HOD" to show the right buttons.

2. `useEffect(() => { fetchDashboardData(); }, [user]);`
   - **What**: The data fetcher.
   - **Why**: As soon as the page loads, it calls the Backend Office to get the list of courses and files.

3. `{user.role === 'HOD' && <HODView />}`
   - **What**: Conditional rendering.
   - **Why**: This is the "Magic" of React. If the user is an HOD, the HOD-specific tools appear. If they are a student, these tools don't even exist in the browser!

---

### SECTION 6: THE REQUEST LIFECYCLE (THE 10-STEP JOURNEY)
To summarize how everything connects, let's trace a request for "Course List":

1. **User Action**: You click "My Courses" on the **Dashboard** (Frontend).
2. **The Call**: React sends a **GET Request** to `https://api.pbl-cfms.com/api/courses`.
3. **The Entrance**: The request hits **`server.js`** (Backend).
4. **The Hallway**: Express sees `/api/courses` and sends it to **`courseRoutes.js`**.
5. **The Guard**: **`authMiddleware.js`** stops the request and asks, "Where is your ID?" It checks the token with Firebase.
6. **The Desk**: If the ID is good, the request goes to **`courseController.js`**.
7. **The Logic**: The clerk (Controller) looks at the ID and decides which courses you are allowed to see.
8. **The Storage**: The clerk asks the **Sequelize Model** to find those courses in the **Database**.
9. **The Preparation**: The clerk packages the list into a neat JSON parcel.
10. **The Delivery**: The parcel is sent back through the browser to the **Dashboard**, which draws the list on your screen.

---

### FINAL SUMMARY
This project is more than just code; it’s an **Automated Ecosystem**. 
- The **Backend** is the engine of truth (Database and Logic).
- The **Frontend** is the interface of action (Buttons and Displays).
- The **Middleware** is the glue of security.
- The **Workers** are the brawn for heavy tasks.

By following this line-by-line guide, you now understand not just *what* the code says, but *why* every line is a necessary brick in this digital university department.

---
*Manual compiled by Antigravity AI - Senior Engineer & Teacher Persona - 2026*
