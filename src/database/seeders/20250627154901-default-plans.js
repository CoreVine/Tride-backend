'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */

    const defaultPlans = [
      {
        id: 1,
        range: 'monthly',
        discount_percentage: 0.0,
        pay_every_n_months: 1,
        months_count: 1
      },
      {
        id: 2,
        range: 'term',
        discount_percentage: 0.0,
        pay_every_n_months: 4,
        months_count: 4
      },
      {
        id: 3,
        range: 'double-terms',
        discount_percentage: 0.0,
        pay_every_n_months: 8,
        months_count: 8
      }
    ];
    // Update existing plans instead of deleting to avoid foreign key constraints
    await queryInterface.bulkUpdate('plan', {
      range: 'monthly',
      discount_percentage: 0.0,
      pay_every_n_months: 1,
      months_count: 1
    }, { id: 1 });

    await queryInterface.bulkUpdate('plan', {
      range: 'term',
      discount_percentage: 0.0,
      pay_every_n_months: 4,
      months_count: 4
    }, { id: 2 });

    await queryInterface.bulkUpdate('plan', {
      range: 'double-terms',
      discount_percentage: 0.0,
      pay_every_n_months: 8,
      months_count: 8
    }, { id: 3 });

    // Delete plans with IDs 4, 5, 6 if they exist and have no references
    try {
      await queryInterface.bulkDelete('plan', { id: [4, 5, 6] }, {});
    } catch (error) {
      console.log('Some plans could not be deleted due to foreign key constraints');
    }
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};


