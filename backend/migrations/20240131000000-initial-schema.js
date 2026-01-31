'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = await queryInterface.showAllTables();

        // Helper to check if table exists
        const tableExists = (tableName) => tables.includes(tableName);

        // 1. Create Users Table
        if (!tableExists('users')) {
            await queryInterface.createTable('users', {
                id: {
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                    type: Sequelize.INTEGER
                },
                name: {
                    type: Sequelize.STRING,
                    allowNull: false
                },
                email: {
                    type: Sequelize.STRING,
                    allowNull: false,
                    unique: true
                },
                password: {
                    type: Sequelize.STRING,
                    allowNull: true
                },
                role: {
                    type: Sequelize.ENUM('admin', 'faculty', 'student', 'reviewer'),
                    defaultValue: 'student'
                },
                is_coordinator: {
                    type: Sequelize.BOOLEAN,
                    defaultValue: false
                },
                firebase_uid: {
                    type: Sequelize.STRING,
                    unique: true,
                    allowNull: true
                },
                section: {
                    type: Sequelize.STRING,
                    allowNull: true
                },
                academic_semester: {
                    type: Sequelize.STRING,
                    allowNull: true
                }
            });
            console.log('Created table: users');
        } else {
            console.log('Table exists, skipping: users');
        }

        // 2. Create Courses Table
        if (!tableExists('courses')) {
            await queryInterface.createTable('courses', {
                id: {
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                    type: Sequelize.INTEGER
                },
                course_code: {
                    type: Sequelize.STRING,
                    allowNull: false
                },
                course_name: {
                    type: Sequelize.STRING,
                    allowNull: false
                },
                semester: {
                    type: Sequelize.STRING,
                    allowNull: false
                },
                faculty_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'users',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL'
                }
            });
            console.log('Created table: courses');
        } else {
            console.log('Table exists, skipping: courses');
        }

        // 3. Create Course Files Table
        if (!tableExists('course_files')) {
            await queryInterface.createTable('course_files', {
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
                file_type: {
                    type: Sequelize.ENUM(
                        'handout', 'attendance', 'assignment', 'marks',
                        'academic_feedback', 'action_taken', 'exam_paper',
                        'remedial', 'case_study', 'quiz', 'quiz_solution',
                        'exam_solution', 'assignment_solution', 'other'
                    ),
                    allowNull: false
                },
                filename: {
                    type: Sequelize.STRING,
                    allowNull: false
                },
                s3_key: {
                    type: Sequelize.STRING,
                    allowNull: false
                },
                uploaded_at: {
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.fn('NOW')
                },
                is_visible: {
                    type: Sequelize.BOOLEAN,
                    defaultValue: true
                }
            });
            console.log('Created table: course_files');
        } else {
            console.log('Table exists, skipping: course_files');
        }

        // 4. Create Enrollments Table
        if (!tableExists('enrollments')) {
            await queryInterface.createTable('enrollments', {
                id: {
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                    type: Sequelize.INTEGER
                },
                student_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'users',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
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
                createdAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.fn('NOW')
                },
                updatedAt: {
                    allowNull: false,
                    type: Sequelize.DATE,
                    defaultValue: Sequelize.fn('NOW')
                }
            });
            console.log('Created table: enrollments');
        } else {
            console.log('Table exists, skipping: enrollments');
        }
    },

    async down(queryInterface, Sequelize) {
        // We only drop if we want to undo.
        // Careful with dropping tables that existed before migration!
        // But standard down() is reverse of up().
        await queryInterface.dropTable('enrollments');
        await queryInterface.dropTable('course_files');
        await queryInterface.dropTable('courses');
        await queryInterface.dropTable('users');
    }
};
