const admin = require('../config/firebaseAdmin');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verify token with Firebase Admin
            console.log(`[DEBUG] Verifying token: ${token.substring(0, 10)}...`);
            const decodedToken = await admin.auth().verifyIdToken(token);
            req.user = decodedToken; // { uid, email, ... }
            console.log(`[DEBUG] Token verified for: ${req.user.email}`);

            // Attach internal user ID and Role from MySQL
            const internalUser = await User.findOne({ where: { email: req.user.email } });
            if (internalUser) {
                req.user.id = internalUser.id;
                req.user.role = internalUser.role;
                req.user.is_coordinator = internalUser.is_coordinator;
                console.log(`[DEBUG] Internal User found. ID: ${internalUser.id}, Role: ${internalUser.role}, Coordinator: ${internalUser.is_coordinator}`);
            } else {
                console.log(`[DEBUG] No internal user found for ${req.user.email}`);
                // If checking sync route, we might not have user yet, which is fine
            }

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

module.exports = { protect, authorize };
