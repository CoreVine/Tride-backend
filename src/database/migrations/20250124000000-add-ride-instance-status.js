'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if ride_instance table exists
    const tables = await queryInterface.showAllTables();
    
    if (!tables.includes('ride_instance')) {
      // Create the ride_instance table if it doesn't exist
      await queryInterface.createTable('ride_instance', {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        driver_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
          references: {
            model: 'driver',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        started_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        status: {
          type: Sequelize.ENUM(["started", "active", "ended"]),
          allowNull: false,
          defaultValue: "started"
        },
        ended_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        type: {
          type: Sequelize.ENUM(["to_school", "to_home"]),
          allowNull: false
        },
        group_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: {
            model: 'ride_group',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        }
      });
      console.log('✅ Created ride_instance table with all required columns');
    } else {
      // Check if status column exists
      const tableDescription = await queryInterface.describeTable('ride_instance');
      
      if (!tableDescription.status) {
        await queryInterface.addColumn('ride_instance', 'status', {
          type: Sequelize.ENUM(["started", "active", "ended"]),
          allowNull: false,
          defaultValue: "started"
        });
        console.log('✅ Added status column to ride_instance table');
      }
      
      if (!tableDescription.ended_at) {
        await queryInterface.addColumn('ride_instance', 'ended_at', {
          type: Sequelize.DATE,
          allowNull: true
        });
        console.log('✅ Added ended_at column to ride_instance table');
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Check if table exists before attempting operations
    const tables = await queryInterface.showAllTables();
    
    if (tables.includes('ride_instance')) {
      const tableDescription = await queryInterface.describeTable('ride_instance');
      
      if (tableDescription.status) {
        await queryInterface.removeColumn('ride_instance', 'status');
      }
      
      if (tableDescription.ended_at) {
        await queryInterface.removeColumn('ride_instance', 'ended_at');
      }
      
      // Note: We don't drop the entire table in down migration to preserve data
    }
  }
};
