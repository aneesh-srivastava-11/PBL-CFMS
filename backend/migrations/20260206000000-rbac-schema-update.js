'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Add coordinator_id to courses
        await queryInterface.addColumn('courses', 'coordinator_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });

        // 2. Create course_sections table
        await queryInterface.createTable('course_sections', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            course_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'courses',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            section: {
                type: Sequelize.STRING,
                allowNull: false
            },
            instructor_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            // Note: Existing tables use 'createdAt' camelCase? 
            // Checking initialSchema: yes, createdAt/updatedAt are standard. 
            // Wait, initial schema for users/courses didn't show timestamps? 
            // Actually enrollments had createdAt. users/courses/files didn't have explicit timestamps in initial-schema? 
            // Let's check initial-schema again. 
            // users: NO timestamps. courses: NO timestamps. 
            // course_files: uploaded_at. 
            // enrollments: createdAt, updatedAt.
            // I will add timestamps to course_sections as it is good practice, but I should use the same convention.
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // 3. Add section to enrollments
        await queryInterface.addColumn('enrollments', 'section', {
            type: Sequelize.STRING,
            allowNull: true,
        });

        // 4. Add fields to course_files (NOT Files)
        await queryInterface.addColumn('course_files', 'section', {
            type: Sequelize.STRING,
            allowNull: true,
        });
        await queryInterface.addColumn('course_files', 'uploaded_by', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });

        // 5. Update User Role Enum
        try {
            if (queryInterface.sequelize.dialect.name === 'postgres') {
                await queryInterface.sequelize.query("ALTER TYPE \"enum_users_role\" ADD VALUE 'hod';");
            } else {
                // MySQL / SQLite
                await queryInterface.changeColumn('users', 'role', {
                    type: Sequelize.ENUM('admin', 'faculty', 'student', 'reviewer', 'hod'),
                    defaultValue: 'student'
                });
            }
        } catch (e) {
            console.warn("Could not update Enum, might already exist or not supported", e);
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Revert changes
        await queryInterface.removeColumn('courses', 'coordinator_id');
        await queryInterface.dropTable('course_sections');
        await queryInterface.removeColumn('enrollments', 'section');
        await queryInterface.removeColumn('course_files', 'section');
        await queryInterface.removeColumn('course_files', 'uploaded_by');
    }
};
