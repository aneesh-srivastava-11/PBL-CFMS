const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'course_file_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false, // Set to console.log to see SQL queries
    }
);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('MySQL Connected (Sequelize)');

        // Sync models (careful with force: true in production!)
        // await sequelize.sync({ alter: true }); 
        // console.log('Database Synced');
    } catch (error) {
        console.error('Database Connection Error:', error);
        process.exit(1);
    }
};

connectDB();

module.exports = sequelize;
