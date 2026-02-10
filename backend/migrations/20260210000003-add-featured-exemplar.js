'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('student_submissions', 'is_featured_exemplar', {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            comment: 'Coordinator can mark exemplars to include in course file PDF (double star)'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('student_submissions', 'is_featured_exemplar');
    }
};
