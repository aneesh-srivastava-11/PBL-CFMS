'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Create the CourseCoordinators junction table
        await queryInterface.createTable('CourseCoordinators', {
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
            coordinator_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // 2. Add unique constraint to prevent duplicate assignments
        await queryInterface.addConstraint('CourseCoordinators', {
            fields: ['course_id', 'coordinator_id'],
            type: 'unique',
            name: 'unique_course_coordinator'
        });

        // 3. Migrate existing data from courses.coordinator_id
        // We need to use raw SQL because models might not be updated yet
        const [courses] = await queryInterface.sequelize.query(
            `SELECT id, coordinator_id FROM courses WHERE coordinator_id IS NOT NULL;`
        );

        if (courses.length > 0) {
            const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const values = courses.map(c => `(${c.id}, ${c.coordinator_id}, '${timestamp}', '${timestamp}')`).join(',');

            await queryInterface.sequelize.query(
                `INSERT INTO "CourseCoordinators" (course_id, coordinator_id, created_at, updated_at) VALUES ${values};`
            );
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('CourseCoordinators');
    }
};
