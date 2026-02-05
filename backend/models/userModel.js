const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    phone_number: {
        type: DataTypes.STRING,
        allowNull: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true // Changed to true since we use Firebase mostly now
    },
    role: {
        type: DataTypes.ENUM('admin', 'faculty', 'student', 'reviewer', 'hod'),
        defaultValue: 'student'
    },
    is_coordinator: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    firebase_uid: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true
    },
    section: {
        type: DataTypes.STRING,
        allowNull: true
    },
    academic_semester: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: false // Assuming no createdAt/updatedAt columns in current schema, set true if added
});

module.exports = User;
