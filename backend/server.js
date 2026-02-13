const express = require('express');
require('dotenv').config();
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');



const db = require('./config/db');
require('./models'); // Initialize associations



// Initialize Firebase Admin SDK BEFORE routes load
require('./config/firebaseAdmin');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust Proxy (Required for Vercel/behind reverse proxy)
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet()); // Set Security Headers
app.use(xss()); // Prevent XSS Attacks
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Rate Limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 5000, // Increased for production testing (effectively unlimited)
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

// Apply the rate limiting middleware to all requests.
app.use(limiter);

// CORS Configuration - Allow frontend origins
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://pbl-cfms-frontend.vercel.app',
    'https://pbl-cfms.vercel.app'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS')); // ✅ Reject unknown origins
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));


// Regular Middleware
app.use(express.json()); // Body parser should come after security headers but generally before XSS clean if possible, but xss-clean works on body
const os = require('os');
app.use('/uploads', express.static(os.tmpdir()));

// Routes Placeholder
app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/enroll', require('./routes/enrollmentRoutes'));
app.use('/api/hod', require('./routes/hodRoutes'));
app.use('/api/coordinator', require('./routes/coordinatorRoutes'));
app.use('/api/submissions', require('./routes/submissionRoutes'));

// Error Handling Middleware
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
app.use(notFound);
app.use(errorHandler);

// Only listen if executed directly (not when imported by Vercel)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
