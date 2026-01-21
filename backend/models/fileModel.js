const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const File = sequelize.define('File', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    course_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    file_type: {
        type: DataTypes.ENUM(
            'handout', 'attendance', 'assignment', 'marks',
            'academic_feedback', 'action_taken', 'exam_paper',
            'remedial', 'case_study', 'quiz', 'quiz_solution',
            'exam_solution', 'assignment_solution', 'other'
        ),
        allowNull: false
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: false
    },
    s3_key: {
        type: DataTypes.STRING,
        allowNull: false
    },
    uploaded_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    is_visible: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'course_files',
    timestamps: false
});

module.exports = File;
