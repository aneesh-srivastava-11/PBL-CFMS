const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // Required for some cloud providers like Supabase/Heroku
            }
        }
    })
    : new Sequelize(
        process.env.DB_NAME || 'course_file_db',
        process.env.DB_USER || 'root',
        process.env.DB_PASSWORD || '',
        {
            host: process.env.DB_HOST || 'localhost',
            dialect: 'postgres', // Switched to Postgres
            logging: false,
        }
    );

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('MySQL Connected (Sequelize)');

        // Sync models (careful with force: true in production!)
        await sequelize.sync({ alter: true });
        console.log('Database Synced');
    } catch (error) {
        console.error('Database Connection Error:', error);
        // Do not exit process in serverless environment, just log it.
        // process.exit(1); 
    }
};

connectDB();

module.exports = sequelize;
