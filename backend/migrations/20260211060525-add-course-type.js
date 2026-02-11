'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add course_type enum column to courses table
    await queryInterface.addColumn('courses', 'course_type', {
      type: Sequelize.ENUM('theory', 'lab'),
      allowNull: false,
      defaultValue: 'theory',
      comment: 'Type of course - theory or lab'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove course_type column
    await queryInterface.removeColumn('courses', 'course_type');

    // Remove enum type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_courses_course_type";');
  }
};
