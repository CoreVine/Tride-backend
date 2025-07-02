'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove installment_plan column from plan table
    await queryInterface.removeColumn('plan', 'installment_plan');
    
    // Remove installment-related columns from payment_history table
    await queryInterface.removeColumn('payment_history', 'next_payment_due');
    await queryInterface.removeColumn('payment_history', 'next_payment_amount');
  },

  down: async (queryInterface, Sequelize) => {
    // Add back installment_plan column to plan table
    await queryInterface.addColumn('plan', 'installment_plan', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    
    // Add back installment-related columns to payment_history table
    await queryInterface.addColumn('payment_history', 'next_payment_due', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    await queryInterface.addColumn('payment_history', 'next_payment_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    });
  }
};
