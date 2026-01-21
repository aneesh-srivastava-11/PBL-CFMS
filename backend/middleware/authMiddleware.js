const admin = require('../config/firebaseAdmin');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verify token with Firebase Admin
            const decodedToken = await admin.auth().verifyIdToken(token);
            req.user = decodedToken; // { uid, email, ... }

            // Attach internal user ID and Role from MySQL
            const internalUser = await User.findOne({ where: { email: req.user.email } });
            if (internalUser) {
                req.user.id = internalUser.id;
                req.user.role = internalUser.role;
            } else {
                // If checking sync route, we might not have user yet, which is fine
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
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
