const { QueryInterface, DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.addColumn('ride_history', 'type', {
      type: DataTypes.ENUM('school', 'child', 'garage'),
      allowNull: true, // Allow null for existing records
      after: 'issued_at'
    });

    console.log('✅ Added type column to ride_history table');
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ride_history', 'type');
    console.log('✅ Removed type column from ride_history table');
  }
};
