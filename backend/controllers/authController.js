const User = require('../models/userModel');

exports.loginSync = async (req, res) => {
    try {
        // req.user is already populated by protect middleware (Firebase Token)
        const { uid, email, name } = req.user;

        if (!email) {
            return res.status(400).json({ message: 'Email is required from provider' });
        }

        // Domain Logic - Use environment variables for flexibility
        let role = '';
        const studentDomain = process.env.ALLOWED_STUDENT_DOMAIN || '@muj.manipal.edu';
        const facultyDomain = process.env.ALLOWED_FACULTY_DOMAIN || '@jaipur.manipal.edu';

        if (email.endsWith(facultyDomain)) {
            role = 'faculty';
        } else if (email.endsWith(studentDomain)) {
            role = 'student';
        } else {
            // Strict Domain Check
            return res.status(403).json({
                message: `Unauthorized Email Domain. Only ${facultyDomain} or ${studentDomain} allowed.`
            });
        }

        // Check if user exists in DB
        let user = await User.findOne({ where: { email } });

        if (!user) {
            // Create new user (Sync)
            // Password is now null or 'google-auth'
            user = await User.create({
                name: req.body.name || name || email.split('@')[0],
                email,
                password: 'google-auth',
                role,
                firebase_uid: uid
            });
        } else {
            // Update firebase_uid if missing?
            if (!user.firebase_uid) {
                user.firebase_uid = uid;
                await user.save();
            }
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            is_coordinator: user.is_coordinator,
            firebase_uid: user.firebase_uid
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error during Sync' });
    }
};

exports.toggleCoordinator = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        if (user.role !== 'faculty') {
            return res.status(403).json({ message: 'Only faculty can be coordinators' });
        }

        user.is_coordinator = !user.is_coordinator;
        await user.save();

        res.json({
            message: `Coordinator status updated to ${user.is_coordinator}`,
            is_coordinator: user.is_coordinator
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
