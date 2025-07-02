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
        installment_plan: true,
        discount_percentage: 0.0,
        pay_every_n_months: 1,
        months_count: 1
      },
      {
        id: 2,
        range: 'monthly',
        installment_plan: false,
        discount_percentage: 0.0,
        pay_every_n_months: 1,
        months_count: 1
      },
      {
        id: 3,
        range: 'term',
        installment_plan: true,
        discount_percentage: 0.025,
        pay_every_n_months: 1,
        months_count: 4
      },
      {
        id: 4,
        range: 'term',
        installment_plan: false,
        discount_percentage: 0.05,
        pay_every_n_months: 4,
        months_count: 4
      },
      {
        id: 5,
        range: 'double-terms',
        installment_plan: true,
        discount_percentage: 0.05,
        pay_every_n_months: 1,
        months_count: 8
      },
      {
        id: 6,
        range: 'double-terms',
        installment_plan: false,
        discount_percentage: 0.10,
        pay_every_n_months: 8,
        months_count: 8
      }
    ];
    await queryInterface.bulkDelete('plan', null, {});
    await queryInterface.bulkInsert('plan', defaultPlans);
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


