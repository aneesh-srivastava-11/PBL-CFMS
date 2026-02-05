const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Enrollment = sequelize.define('Enrollment', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users', // 'users' refers to table name
            key: 'id',
        }
    },
    course_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'courses', // 'courses' refers to table name
            key: 'id',
        }
    },
    section: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'enrollments',
    timestamps: true
});

module.exports = Enrollment;
