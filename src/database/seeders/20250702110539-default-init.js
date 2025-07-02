'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const now = new Date();

    const defaultGovernments = [
      { id: 1, governorate_name: 'Cairo' },
      { id: 2, governorate_name: 'Alexandria' },
      { id: 3, governorate_name: 'Giza' }
    ];

    const defaultCities = [
      { id: 1, name: 'Cairo City', governorate_id: 1 },
      { id: 2, name: 'Alexandria City', governorate_id: 2 },
      { id: 3, name: 'Giza City', governorate_id: 3 }
    ];

    const defaultSchools = [
      { id: 1, school_name: 'Cairo International School', city_id: 1, lat: 30.0444, lng: 31.2357 },
      { id: 2, school_name: 'Alexandria Modern School', city_id: 2, lat: 31.2156, lng: 29.9553 },
      { id: 3, school_name: 'Giza Comprehensive School', city_id: 3, lat: 29.9765, lng: 31.1313 },
    ];

    const defaultAccounts = [
      {
        id: 1,
        email: 'ah250296@gmail.com',
        password: await bcrypt.hash('password', 8),
        account_type: 'parent',
        is_verified: true,
        auth_method: 'email'
      },
      {
        id: 2,
        email: 'driver@example.com',
        password: await bcrypt.hash('password', 8),
        account_type: 'driver',
        is_verified: true,
        auth_method: 'email'
      }
    ];

    const defaultParents = [
      {
        id: 1,
        account_id: 1,
        name: 'Ahmed Ali',
        profile_pic: 'https://example.com/profile1.jpg',
        phone: '+201234567890',
        google_place_id: 'ChIJd8BlQ2BZwokRAFUEcm_qrcA',
        lat: 30.0444,
        lng: 31.2357,
        formatted_address: '123 Nile St, Cairo, Egypt',
        city_id: 1,
        gender: 'male',
        front_side_nic: 'https://example.com/front_nic1.jpg',
        back_side_nic: 'https://example.com/back_nic1.jpg',
        face_auth_complete: true,
        documents_approved: true,
        documents_approval_date: new Date(),
        created_at: now,
        updated_at: now
      }
    ];

    const defaultDrivers = [
      {
        id: 1,
        account_id: 2,
        name: 'Mohamed Ali',
        profile_pic: 'https://example.com/profile2.jpg',
        phone: '+201234567890',
        license_number: '1234567890',
        lat: 30.0444,
        lng: 31.2357,
        formatted_address: '123 Nile St, Cairo, Egypt',
        city_id: 1,
        gender: 'male',
        created_at: now,
        updated_at: now
      }
    ];

    const defaultChildren = [
      {
        id: 1,
        name: 'Ali',
        profile_pic: 'https://example.com/child1.jpg',
        grade: '1st',
        gender: 'male',
        parent_id: 1
      },
      {
        id: 2,
        name: 'Omar',
        profile_pic: 'https://example.com/child2.jpg',
        grade: '2nd',
        gender: 'male',
        parent_id: 1
      },
      {
        id: 3,
        name: 'Fatima',
        profile_pic: 'https://example.com/child3.jpg',
        grade: '3rd',
        gender: 'female',
        parent_id: 1
      }
    ];

    const defaultGroups = [
      {
        id: 1, // Add explicit ID
        parent_creator_id: 1,
        group_name: 'Morning School Ride',
        created_at: now,
        updated_at: now,
        driver_id: 1,
        school_id: 1,
        current_seats_taken: 0,
        invite_code: 'ABC12345',
        group_type: 'regular'
      }
    ];

    const defaultParentGroup = [
      {
        id: 1,
        group_id: 1,
        parent_id: 1,
        home_lat: 30.0444,
        home_lng: 31.2357,
        current_seats_taken: 3
      }
    ];

    const defaultGroupDays = [
      {
        ride_group_detailsid: 1,
        date_day: 'Sunday'
      },
      {
        ride_group_detailsid: 1,
        date_day: 'Monday'
      },
      {
        ride_group_detailsid: 1,
        date_day: 'Tuesday'
      },
      {
        ride_group_detailsid: 1,
        date_day: 'Wednesday'
      }
    ];

    const defaultChildrenGroups = [
      {
        parent_group_id: 1,
        child_id: 1,
        timing_from: '08:00:00',
        timing_to: '14:00:00'
      },
      {
        parent_group_id: 1,
        child_id: 2,
        timing_from: '08:15:00',
        timing_to: '14:15:00'
      },
      {
        parent_group_id: 1,
        child_id: 3,
        timing_from: '08:30:00',
        timing_to: '14:30:00'
      }
    ];

    // Delete data in reverse dependency order (child tables first)
    await queryInterface.bulkDelete('child_group_details', null, {});
    await queryInterface.bulkDelete('day_dates_group', null, {});
    await queryInterface.bulkDelete('parent_group_subscription', null, {});
    await queryInterface.bulkDelete('parent_group', null, {});
    await queryInterface.bulkDelete('ride_child_delivered', null, {});
    await queryInterface.bulkDelete('ride_history', null, {});
    await queryInterface.bulkDelete('ride_instance', null, {});
    await queryInterface.bulkDelete('ride_group', null, {});
    await queryInterface.bulkDelete('child', null, {});
    await queryInterface.bulkDelete('driver_papers', null, {});
    await queryInterface.bulkDelete('driver_payment', null, {});
    await queryInterface.bulkDelete('driver', null, {});
    await queryInterface.bulkDelete('parent', null, {});
    await queryInterface.bulkDelete('account', null, {});
    await queryInterface.bulkDelete('schools', null, {});
    await queryInterface.bulkDelete('city', null, {});
    await queryInterface.bulkDelete('governorate', null, {});

    // Insert data in dependency order
    await queryInterface.bulkInsert('governorate', defaultGovernments, {});
    await queryInterface.bulkInsert('city', defaultCities, {});
    await queryInterface.bulkInsert('schools', defaultSchools, {});
    await queryInterface.bulkInsert('account', defaultAccounts, {});
    await queryInterface.bulkInsert('parent', defaultParents, {});
    await queryInterface.bulkInsert('driver', defaultDrivers, {});
    await queryInterface.bulkInsert('child', defaultChildren, {});
    await queryInterface.bulkInsert('ride_group', defaultGroups, {});
    await queryInterface.bulkInsert('parent_group', defaultParentGroup, {});
    await queryInterface.bulkInsert('day_dates_group', defaultGroupDays, {});
    await queryInterface.bulkInsert('child_group_details', defaultChildrenGroups, {});

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
