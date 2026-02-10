const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StudentSubmission = sequelize.define('StudentSubmission', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    file_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'course_files',
            key: 'id'
        },
        comment: 'Reference to the assignment file'
    },
    student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    course_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'courses',
            key: 'id'
        }
    },
    s3_key: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'S3 path to submission PDF'
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: false
    },
    marks: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Numeric grade for the submission'
    },
    graded_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Instructor who graded this submission'
    },
    graded_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    exemplar_type: {
        type: DataTypes.ENUM('best', 'average', 'poor'),
        allowNull: true,
        comment: 'Mark submission as exemplar (best/average/poor)'
    },
    submitted_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'student_submissions',
    timestamps: false
});

module.exports = StudentSubmission;
