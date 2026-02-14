const admin = require('../config/firebaseAdmin');
const User = require('../models/userModel');
const logger = require('../utils/logger');
const { LRUCache } = require('lru-cache');

// Initialize cache: Max 500 users, 10 minutes TTL
const userCache = new LRUCache({
    max: 500,
    ttl: 1000 * 60 * 10, // 10 Minutes
});

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // 1. Check Cache
            const cachedUser = userCache.get(token);
            if (cachedUser) {
                req.user = cachedUser;
                return next();
            }

            // 2. Verify token with Firebase Admin
            // logger.debug(`[DEBUG] Verifying token: ${token.substring(0, 10)}...`);
            const decodedToken = await admin.auth().verifyIdToken(token);
            req.user = decodedToken; // { uid, email, ... }

            // 3. Attach internal user ID and Role from MySQL
            // Use case-insensitive search to ensure matching
            const { Op } = require('sequelize');
            const internalUser = await User.findOne({
                where: {
                    email: { [Op.iLike]: req.user.email }
                }
            });

            if (internalUser) {
                req.user.id = internalUser.id;
                req.user.role = internalUser.role;
                req.user.is_coordinator = internalUser.is_coordinator;
            }

            // 4. Store in Cache
            userCache.set(token, req.user);

            next();
        } catch (error) {
            console.error(`[DEBUG] Token Verification Failed:`, error.message);
            res.status(401).json({ message: 'Not authorized, token failed', error: error.message });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Role ${req.user.role} is not authorized to access this route` });
        }
        next();
    };
};

// Check if user is HOD
const requireHOD = (req, res, next) => {
    if (req.user.role !== 'hod' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. HOD only.' });
    }
    next();
};

// Start export
module.exports = { protect, authorize, requireHOD };
