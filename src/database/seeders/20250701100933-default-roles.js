'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles_permissions', null, {});
    await queryInterface.bulkDelete('admin_roles', null, {});

    const adminRoles = [
      {
        role_name: 'super admin',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_name: 'operations manager',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_name: 'support admin',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      }
    ];

    const rolesPermissions = [
      {
        role_permission_group: 'Chats',
        role_permission_name: 'Chats with driver',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_permission_group: 'Chats',
        role_permission_name: 'Chats with parent',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_permission_group: 'Chat',
        role_permission_name: 'View chat history',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_permission_group: 'Trips',
        role_permission_name: 'Trips',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_permission_group: 'Requests',
        role_permission_name: 'Requests',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_permission_group: 'Live Tracking',
        role_permission_name: 'Live Tracking',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_permission_group: 'Payments',
        role_permission_name: 'Payments',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      },
      {
        role_permission_group: 'Schools',
        role_permission_name: 'Schools',
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      }
    ];

    await queryInterface.bulkInsert('admin_roles', adminRoles);
    await queryInterface.bulkInsert('roles_permissions', rolesPermissions);
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
