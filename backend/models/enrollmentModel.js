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
            model: 'Users', // 'Users' refers to table name
            key: 'id',
        }
    },
    course_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Courses', // 'Courses' refers to table name
            key: 'id',
        }
    }
}, {
    tableName: 'enrollments',
    timestamps: true
});

module.exports = Enrollment;
