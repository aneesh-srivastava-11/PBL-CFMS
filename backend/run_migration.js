const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'course_file_db',
    multipleStatements: true // Essential for running migration scripts
};

async function runMigration() {
    let connection;
    try {
        console.log("Connecting to database...");
        connection = await mysql.createConnection(config);
        console.log("Connected.");

        const migrationPath = path.join(__dirname, 'database_migration.sql');
        if (!fs.existsSync(migrationPath)) {
            console.error("Migration file not found at " + migrationPath);
            return;
        }

        const sql = fs.readFileSync(migrationPath, 'utf8');
        console.log("Executing migration...");

        // Split by semicolon just in case multipleStatements isn't enough for some drivers, 
        // but mysql2 supports it. Let's try direct execution first.
        await connection.query(sql);

        console.log("Migration executed successfully!");
        console.log("Added firebase_uid column to users table.");

    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log("Migration already applied: Column 'firebase_uid' likely exists.");
        } else {
            console.error("Migration failed:", error.message);
        }
    } finally {
        if (connection) await connection.end();
    }
}

runMigration();
