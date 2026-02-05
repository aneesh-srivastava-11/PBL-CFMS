const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CourseSection = sequelize.define('CourseSection', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    course_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'courses',
            key: 'id'
        }
    },
    instructor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    section: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'course_sections',
    timestamps: false
});

module.exports = CourseSection;
