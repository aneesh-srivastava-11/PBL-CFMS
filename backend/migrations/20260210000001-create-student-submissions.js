module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('student_submissions', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            file_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'course_files',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
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
            s3_key: {
                type: Sequelize.STRING,
                allowNull: false
            },
            filename: {
                type: Sequelize.STRING,
                allowNull: false
            },
            marks: {
                type: Sequelize.DECIMAL(5, 2),
                allowNull: true
            },
            graded_by: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            graded_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            exemplar_type: {
                type: Sequelize.ENUM('best', 'average', 'poor'),
                allowNull: true
            },
            submitted_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            }
        });

        // Add indexes for faster queries
        await queryInterface.addIndex('student_submissions', ['file_id']);
        await queryInterface.addIndex('student_submissions', ['student_id']);
        await queryInterface.addIndex('student_submissions', ['course_id']);
        await queryInterface.addIndex('student_submissions', ['graded_by']);

        // Ensure unique submission per student per assignment
        await queryInterface.addConstraint('student_submissions', {
            fields: ['file_id', 'student_id'],
            type: 'unique',
            name: 'unique_student_assignment_submission'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('student_submissions');
    }
};
