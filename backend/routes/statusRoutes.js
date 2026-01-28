const express = require('express');
const router = express.Router();
const sequelize = require('../config/db');
const admin = require('../config/firebaseAdmin');

router.get('/', async (req, res) => {
    const status = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database: 'Unknown',
        firebase: 'Unknown',
        env_vars: {
            HAS_DB_URL: !!process.env.DATABASE_URL,
            HAS_FIREBASE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
            HAS_FIREBASE_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL
        }
    };

    // Check Database
    try {
        await sequelize.authenticate();
        status.database = 'Connected';
    } catch (error) {
        status.database = `Error: ${error.message}`;
    }

    // Check Firebase
    try {
        if (admin.apps.length > 0) {
            status.firebase = 'Initialized';
        } else {
            status.firebase = 'Not Initialized';
        }
    } catch (error) {
        status.firebase = `Error: ${error.message}`;
    }

    const statusCode = (status.database === 'Connected' && status.firebase === 'Initialized') ? 200 : 500;
    res.status(statusCode).json(status);
});

module.exports = router;
