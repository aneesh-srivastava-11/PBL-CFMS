const sequelize = require('./config/db');

async function fixEnum() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Connected.');

        console.log('Adding "class_material" to enum_course_files_file_type...');
        // Postgres command to add value to ENUM type if not exists
        await sequelize.query(`ALTER TYPE "enum_course_files_file_type" ADD VALUE IF NOT EXISTS 'class_material';`);

        console.log('Success! "class_material" added to ENUM.');
    } catch (error) {
        console.error('Error updating ENUM:', error);
    } finally {
        await sequelize.close();
    }
}

fixEnum();
