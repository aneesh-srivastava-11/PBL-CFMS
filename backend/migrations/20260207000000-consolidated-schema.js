'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // 1. Users Table
            await queryInterface.createTable('users', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
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
                phone_number: {
                    type: Sequelize.STRING,
                    allowNull: true
                },
                password: {
                    type: Sequelize.STRING,
                    allowNull: true
                },
                role: {
                    type: Sequelize.ENUM('admin', 'faculty', 'student', 'reviewer', 'hod'),
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
            }, { transaction });

            // 2. Courses Table
            await queryInterface.createTable('courses', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
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
                    allowNull: false
                },
                coordinator_id: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL'
                }
            }, { transaction });

            // 3. Course Sections Table
            await queryInterface.createTable('course_sections', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
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
                instructor_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'users',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                section: {
                    type: Sequelize.STRING,
                    allowNull: false
                }
            }, { transaction });

            // 4. Enrollments Table
            await queryInterface.createTable('enrollments', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
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
                section: {
                    type: Sequelize.STRING,
                    allowNull: true
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                }
            }, { transaction });

            // 5. Files Table
            await queryInterface.createTable('course_files', {
                id: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                course_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false
                },
                file_type: {
                    type: Sequelize.ENUM(
                        'handout', 'attendance', 'assignment', 'marks',
                        'academic_feedback', 'action_taken', 'exam_paper',
                        'remedial', 'case_study', 'quiz', 'quiz_solution',
                        'exam_solution', 'assignment_solution', 'materials', 'other'
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
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                section: {
                    type: Sequelize.STRING,
                    allowNull: true
                },
                uploaded_by: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL'
                },
                is_visible: {
                    type: Sequelize.BOOLEAN,
                    defaultValue: true
                }
            }, { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.dropTable('course_files', { transaction });
            await queryInterface.dropTable('enrollments', { transaction });
            await queryInterface.dropTable('course_sections', { transaction });
            await queryInterface.dropTable('courses', { transaction });
            await queryInterface.dropTable('users', { transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};
