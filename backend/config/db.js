const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectModule: require('pg'), // Explicitly require pg for Vercel
        logging: false,
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
            dialectModule: require('pg'), // Explicitly require pg for Vercel
            logging: false,
        }
    );

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('PostgreSQL Connected (Sequelize)');

        // IMPORTANT: In production, schema is managed by migrations ONLY
        // sync() with alter:true is DANGEROUS and can cause data loss
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log('Database Synced (Development Only)');
        } else {
            console.log('Database schema managed by migrations (Production)');
        }
    } catch (error) {
        console.error('Database Connection Error:', error);
        process.exit(1);
    }
};

connectDB();

module.exports = sequelize;
