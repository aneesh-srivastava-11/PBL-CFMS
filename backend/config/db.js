const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        pool: {
            max: 2,
            min: 0,
            acquire: 3000,
            idle: 0
        },
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    })
    : new Sequelize(
        process.env.DB_NAME || 'course_file_db',
        process.env.DB_USER || 'root',
        process.env.DB_PASSWORD || '',
        {
            host: process.env.DB_HOST || 'localhost',
            dialect: 'postgres',
            logging: false,
            // Serverless Connection Pooling
            pool: {
                max: 2,     // Limit max connections per lambda container
                min: 0,
                acquire: 3000,
                idle: 0     // Terminate idle connections immediately to save resources
            },
            dialectOptions: {
                // Keep Keep-Alive on to re-use connections
                keepAlive: true,
            }
        }
    );

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('MySQL Connected (Sequelize)');

        // Sync models: Disabled for Serverless stability (prevents timeouts)
        // Uncomment this ONLY if you need to update table schemas, then re-comment.
        // await sequelize.sync({ alter: true });
        // console.log('Database Synced');
    } catch (error) {
        console.error('Database Connection Error:', error);
    }
};

// Start connection (Async, doesn't block server start)
connectDB();

module.exports = sequelize;
