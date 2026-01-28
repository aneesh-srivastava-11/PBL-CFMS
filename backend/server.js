const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// 1. CRASH-PROOF STATUS ROUTE
// ============================================
app.get('/api/status', async (req, res) => {
    const status = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        checks: {}
    };

    // Check DB
    try {
        const db = require('./config/db');
        await db.authenticate();
        status.checks.database = 'Connected';
    } catch (e) {
        status.checks.database = `Failed: ${e.message}`;
        status.status = 'degraded';
    }

    // Check Firebase
    try {
        const admin = require('./config/firebaseAdmin');
        status.checks.firebase = admin.apps.length ? 'Initialized' : 'Not Initialized';
    } catch (e) {
        status.checks.firebase = `Failed: ${e.message}`;
        status.status = 'degraded';
    }

    // Check Env
    status.checks.env_vars = {
        DB_URL: !!process.env.DATABASE_URL,
        FIREBASE_KEY: !!process.env.FIREBASE_PRIVATE_KEY
    };

    res.json(status);
});

// ============================================
// 2. MIDDLEWARE
// ============================================
app.use(helmet());
app.use(xss());
app.use(hpp());
app.use(cors());
app.use(express.json());

// ============================================
// 3. SAFE MODULE LOADING
// ============================================
const safeRequire = (path, name) => {
    try {
        return require(path);
    } catch (e) {
        console.error(`FAILED TO LOAD ${name}:`, e);
        return (req, res) => res.status(500).json({
            error: `${name} failed to load`,
            details: e.message
        });
    }
};

// Initialize Models (Fail silently log)
try {
    require('./models');
    console.log("Models Initialized");
} catch (e) {
    console.error("Models Failed:", e.message);
}

// Routes
app.use('/api/auth', safeRequire('./routes/authRoutes', 'Auth Routes'));
app.use('/api/files', safeRequire('./routes/fileRoutes', 'File Routes'));
app.use('/api/courses', safeRequire('./routes/courseRoutes', 'Course Routes'));
app.use('/api/enroll', safeRequire('./routes/enrollmentRoutes', 'Enrollment Routes'));

// Static Files
try {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ message: 'API Route Not Found' });
        res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html'));
    });
} catch (e) {
    console.error("Static File Serving Error:", e);
}

// ============================================
// 4. EXPORT
// ============================================
module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}
