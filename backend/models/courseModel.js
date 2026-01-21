const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Course = sequelize.define('Course', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    course_code: {
        type: DataTypes.STRING,
        allowNull: false
    },
    course_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    semester: {
        type: DataTypes.STRING,
        allowNull: false
    },
    faculty_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'courses',
    timestamps: false
});

module.exports = Course;
