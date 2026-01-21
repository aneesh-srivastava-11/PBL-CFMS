const express = require('express');
require('dotenv').config();
const path = require('path'); // Added path module
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');



const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet()); // Set Security Headers
app.use(xss()); // Prevent XSS Attacks
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Rate Limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { message: 'Too many requests from this IP, please try again after 10 minutes' }
});
app.use(limiter);

// Regular Middleware
app.use(cors());
app.use(express.json()); // Body parser should come after security headers but generally before XSS clean if possible, but xss-clean works on body
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes Placeholder
app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
