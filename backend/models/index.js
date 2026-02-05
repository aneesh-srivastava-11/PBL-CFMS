const sequelize = require('../config/db');
const User = require('./userModel');
const Course = require('./courseModel');
const File = require('./fileModel');
const Enrollment = require('./enrollmentModel');

const CourseSection = require('./courseSectionModel');

// 1. Faculty creates Courses
User.hasMany(Course, { foreignKey: 'faculty_id', as: 'createdCourses' });
Course.belongsTo(User, { foreignKey: 'faculty_id', as: 'creator' });

// 1b. Course has a Coordinator (User)
Course.belongsTo(User, { foreignKey: 'coordinator_id', as: 'coordinator' });
User.hasMany(Course, { foreignKey: 'coordinator_id', as: 'coordinatedCourses' });

// 2. Course has many Files
Course.hasMany(File, { foreignKey: 'course_id', as: 'files', onDelete: 'CASCADE' });
File.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

// 2b. Files have an Uploader
File.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// 3. Students enroll in Courses (Many-to-Many)
User.belongsToMany(Course, { through: Enrollment, foreignKey: 'student_id', as: 'enrolledCourses' });
Course.belongsToMany(User, { through: Enrollment, foreignKey: 'course_id', as: 'students' });

// 4. Course Sections (Instructors assigned to Sections)
Course.hasMany(CourseSection, { foreignKey: 'course_id', as: 'sections' });
CourseSection.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
User.hasMany(CourseSection, { foreignKey: 'instructor_id', as: 'instructorSections' });
CourseSection.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });

// Sync Function
module.exports = { User, Course, File, Enrollment, CourseSection };
