'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Enrollments
            await queryInterface.addIndex('enrollments', ['student_id'], { name: 'idx_enrollments_student_id', transaction });
            await queryInterface.addIndex('enrollments', ['course_id'], { name: 'idx_enrollments_course_id', transaction });

            // Course Files
            await queryInterface.addIndex('course_files', ['course_id'], { name: 'idx_course_files_course_id', transaction });
            await queryInterface.addIndex('course_files', ['course_id', 'file_type'], { name: 'idx_course_files_course_type', transaction });

            // Course Sections
            await queryInterface.addIndex('course_sections', ['course_id'], { name: 'idx_course_sections_course_id', transaction });
            await queryInterface.addIndex('course_sections', ['instructor_id'], { name: 'idx_course_sections_instructor_id', transaction });
            // Add unique constraint index if it doesn't already exist from the unique property
            await queryInterface.addIndex('course_sections', ['course_id', 'section'], { name: 'idx_course_sections_composite', transaction });

            // Users (Role and Section)
            await queryInterface.addIndex('users', ['role'], { name: 'idx_users_role', transaction });
            await queryInterface.addIndex('users', ['section'], { name: 'idx_users_section', transaction });
            await queryInterface.addIndex('users', ['role', 'section'], { name: 'idx_users_role_section', transaction });

            // Note: Since we don't have an explicit 'CourseCoordinators' migration in the list provided that created the table
            // explicitly outside of the Many-to-Many association, we will try to index the junction table if it exists.
            // Sequelize creates it automatically as "CourseCoordinators" with course_id and coordinator_id if not overridden.
            const tableNames = await queryInterface.showAllTables();
            if (tableNames.includes('CourseCoordinators')) {
                await queryInterface.addIndex('CourseCoordinators', ['coordinator_id'], { name: 'idx_cc_coordinator_id', transaction });
                await queryInterface.addIndex('CourseCoordinators', ['course_id'], { name: 'idx_cc_course_id', transaction });
            }

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            await queryInterface.removeIndex('enrollments', 'idx_enrollments_student_id', { transaction });
            await queryInterface.removeIndex('enrollments', 'idx_enrollments_course_id', { transaction });
            
            await queryInterface.removeIndex('course_files', 'idx_course_files_course_id', { transaction });
            await queryInterface.removeIndex('course_files', 'idx_course_files_course_type', { transaction });
            
            await queryInterface.removeIndex('course_sections', 'idx_course_sections_course_id', { transaction });
            await queryInterface.removeIndex('course_sections', 'idx_course_sections_instructor_id', { transaction });
            await queryInterface.removeIndex('course_sections', 'idx_course_sections_composite', { transaction });
            
            await queryInterface.removeIndex('users', 'idx_users_role', { transaction });
            await queryInterface.removeIndex('users', 'idx_users_section', { transaction });
            await queryInterface.removeIndex('users', 'idx_users_role_section', { transaction });

            const tableNames = await queryInterface.showAllTables();
            if (tableNames.includes('CourseCoordinators')) {
                await queryInterface.removeIndex('CourseCoordinators', 'idx_cc_coordinator_id', { transaction });
                await queryInterface.removeIndex('CourseCoordinators', 'idx_cc_course_id', { transaction });
            }

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};
