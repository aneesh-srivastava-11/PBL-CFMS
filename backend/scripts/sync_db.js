const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const sequelize = require('./config/db');
const User = require('./models/userModel');
const Course = require('./models/courseModel');
const Enrollment = require('./models/enrollmentModel');

// Import all models to ensure associations are loaded
require('./models/index');

const syncDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected...');

        // Force sync (drops tables and recreates them)
        // WARNING: DATA LOSS
        // If we want to keep data, use { alter: true } instead of { force: true }
        // User asked for "sync", but implied preserving data?
        // Actually, "list is synced coz im not able to see student".
        // Adding columns usually requires ALTER.
        await sequelize.sync({ alter: true });

        console.log('Database Synced (Alter Mode)!');
        process.exit();
    } catch (error) {
        console.error('Sync failed', error);
        process.exit(1);
    }
};

syncDB();
