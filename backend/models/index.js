const sequelize = require('../config/db');
const User = require('./userModel');
const Course = require('./courseModel');
const File = require('./fileModel');
const Enrollment = require('./enrollmentModel');

// 1. Faculty creates Courses
User.hasMany(Course, { foreignKey: 'faculty_id', as: 'createdCourses' });
Course.belongsTo(User, { foreignKey: 'faculty_id', as: 'creator' });

// 2. Course has many Files
Course.hasMany(File, { foreignKey: 'course_id', as: 'files', onDelete: 'CASCADE' });
File.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

// 3. Students enroll in Courses (Many-to-Many)
User.belongsToMany(Course, { through: Enrollment, foreignKey: 'student_id', as: 'enrolledCourses' });
Course.belongsToMany(User, { through: Enrollment, foreignKey: 'course_id', as: 'students' });

// Sync Function
module.exports = { User, Course, File, Enrollment };
