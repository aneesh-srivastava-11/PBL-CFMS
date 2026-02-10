module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('course_files', 'submissions_enabled', {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            comment: 'Whether student submissions are currently allowed for this assignment'
        });

        await queryInterface.addColumn('course_files', 'submission_deadline', {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Deadline for student submissions'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('course_files', 'submissions_enabled');
        await queryInterface.removeColumn('course_files', 'submission_deadline');
    }
};
