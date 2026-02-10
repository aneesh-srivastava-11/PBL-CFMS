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
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    // store: ... , // Use an external store for consistency across multiple server instances.
});

// Apply the rate limiting middleware to all requests.
app.use(limiter);

// Regular Middleware
app.use(cors());
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
