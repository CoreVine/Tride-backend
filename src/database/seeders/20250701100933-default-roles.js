'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('admin', null, {});
    await queryInterface.bulkDelete('admin_permission', null, {});
    await queryInterface.bulkDelete('admin_roles', null, {});
    await queryInterface.bulkDelete('role_permission', null, {});

    const adminRoles = [
      {
        id: 1,
        role_name: 'super admin',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        id: 2,
        role_name: 'operations manager',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        id: 3,
        role_name: 'support admin',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        id: 4,
        role_name: 'basic admin',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
    ];

    const adminPermissions = [
      {
        id: 1,
        role_permission_group: 'Chats',
        role_permission_name: 'Chats with driver',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        id: 2,
        role_permission_group: 'Chats',
        role_permission_name: 'Chats with parent',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        id: 3,
        role_permission_group: 'Chat',
        role_permission_name: 'View chat history',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        id: 4,
        role_permission_group: 'Trips',
        role_permission_name: 'Trips',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        id: 5,
        role_permission_group: 'Requests',
        role_permission_name: 'Requests',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        id: 6,
        role_permission_group: 'Live Tracking',
        role_permission_name: 'Live Tracking',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        id: 7,
        role_permission_group: 'Payments',
        role_permission_name: 'Payments',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        id: 8,
        role_permission_group: 'Schools',
        role_permission_name: 'Schools',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      }
    ];

    await queryInterface.bulkInsert('admin_roles', adminRoles);
    await queryInterface.bulkInsert('admin_permission', adminPermissions);

    await queryInterface.bulkInsert('role_permission', [
      {
        role_id: 1, // super admin
        permission_id: 1, // Chats with driver
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_id: 1, // super admin
        permission_id: 2, // Chats with parent
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_id: 1, // super admin
        permission_id: 3, // View chat history
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_id: 1, // super admin
        permission_id: 4, // Trips
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_id: 1, // super admin
        permission_id: 5, // Requests
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_id: 1, // super admin
        permission_id: 6, // Live Tracking
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_id: 1, // super admin
        permission_id: 7, // Payments
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_id: 1, // super admin
        permission_id: 8, // Schools
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
    ]
  );
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
