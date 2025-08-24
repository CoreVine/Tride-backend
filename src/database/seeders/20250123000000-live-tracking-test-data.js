"use strict";
const bcrypt = require("bcryptjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // Add Cairo governorate and city if not exists
    const defaultGovernments = [
      { id: 2, governorate_name: "Cairo" }
    ];

    const defaultCities = [
      { id: 4, name: "Nasr City", governorate_id: 2 },
    ];

    // Test school for live tracking
    const testSchool = [
      {
        id: 200,
        school_name: "test school",
        city_id: 4,
        lat: 29.984450411139598,
        lng: 31.32561581359936,
      }
    ];

    // Live tracking test accounts
    const liveTrackingAccounts = [
      {
        id: 1001, // Driver account
        email: "ah@d1.com",
        password: await bcrypt.hash("password", 8),
        account_type: "driver",
        is_verified: true,
        auth_method: "email",
      },
      {
        id: 1002, // Parent 1 account
        email: "ah@p1.com",
        password: await bcrypt.hash("password", 8),
        account_type: "parent",
        is_verified: true,
        auth_method: "email",
      },
      {
        id: 1003, // Parent 2 account
        email: "ah@p2.com",
        password: await bcrypt.hash("password", 8),
        account_type: "parent",
        is_verified: true,
        auth_method: "email",
      }
    ];

    // Live tracking test parents
    const liveTrackingParents = [
      {
        id: 101, // Parent 1
        account_id: 1002,
        name: "ahmedP1",
        profile_pic: "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg",
        phone: "01015518688",
        google_place_id: "ChIJTest001",
        lat: 29.983118437109667,
        lng: 31.321797582017027,
        formatted_address: "sada ST cairo",
        city_id: 4,
        gender: "male",
        front_side_nic: "https://example.com/test_front_nic1.jpg",
        back_side_nic: "https://example.com/test_back_nic1.jpg",
        face_auth_complete: true,
        documents_approved: true,
        documents_approval_date: now,
        created_at: now,
        updated_at: now,
      },
      {
        id: 102, // Parent 2
        account_id: 1003,
        name: "ahmedP2",
        profile_pic: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg",
        phone: "01015518688",
        google_place_id: "ChIJTest002",
        lat: 29.9817868849066,
        lng: 31.3263882582345,
        formatted_address: "horia ST cairo",
        city_id: 4,
        gender: "male",
        front_side_nic: "https://example.com/test_front_nic2.jpg",
        back_side_nic: "https://example.com/test_back_nic2.jpg",
        face_auth_complete: true,
        documents_approved: true,
        documents_approval_date: now,
        created_at: now,
        updated_at: now,
      }
    ];

    // Live tracking test driver
    const liveTrackingDrivers = [
      {
        id: 101,
        account_id: 1001,
        name: "ahmed driver",
        profile_pic: "https://images.pexels.com/photos/712513/pexels-photo-712513.jpeg",
        phone: "01017528698",
        license_number: "TESTLIC001",
        lat: 29.987073938979787,
        lng: 31.334552232417717,
        formatted_address: "Driver Starting Point, Cairo, Egypt",
        city_id: 4,
        gender: "male",
        created_at: now,
        updated_at: now,
      },
    ];

    // Driver papers (APPROVED for live tracking)
    const liveTrackingDriverPapers = [
      {
        id: 101,
        driver_id: 101,
        front_side_national_url: "https://example.com/test_front_national.jpg",
        back_side_national_url: "https://example.com/test_back_national.jpg",
        car_model: "Hyundai Elantra",
        car_model_year: 2020,
        driver_license_url: "https://example.com/test_driver_license.jpg",
        driver_license_exp_date: new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()),
        car_license_url: "https://example.com/test_car_license.jpg",
        car_license_exp_date: new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()),
        approved: true, // APPROVED for testing
        approval_date: now,
        face_auth_complete: 1,
      }
    ];

    // Test children
    const liveTrackingChildren = [
      {
        id: 1001, // Child 1 - Parent 1
        name: "fayroiz",
        profile_pic: "https://images.pexels.com/photos/35537/child-children-girl-happy.jpg",
        grade: "grade 1",
        gender: "female",
        parent_id: 101,
      },
      {
        id: 1002, // Child 2 - Parent 2
        name: "jane",
        profile_pic: "https://images.pexels.com/photos/1462636/pexels-photo-1462636.jpeg",
        grade: "grade 1", 
        gender: "female",
        parent_id: 102,
      }
    ];

    // Live tracking test ride group
    const liveTrackingRideGroups = [
      {
        id: 1001,
        parent_creator_id: 101,
        group_name: "test-school",
        created_at: now,
        updated_at: now,
        driver_id: 101, // Assigned driver
        school_id: 200, // Test school
        current_seats_taken: 2, // Both children
        invite_code: "LIVE2024",
        group_type: "premium",
      }
    ];

    // Parent group memberships
    const liveTrackingParentGroups = [
      {
        id: 1001, // Parent 1 in ride group
        group_id: 1001,
        parent_id: 101,
        home_lat: 29.983118437109667,
        home_lng: 31.321797582017027,
        current_seats_taken: 1, // 1 child
        status: "active",
      },
      {
        id: 1002, // Parent 2 in ride group
        group_id: 1001,
        parent_id: 102,
        home_lat: 29.9817868849066,
        home_lng: 31.3263882582345,
        current_seats_taken: 1, // 1 child
        status: "active",
      }
    ];

    // Ride schedule (weekdays)
    const liveTrackingGroupDays = [
      { ride_group_detailsid: 1001, date_day: "Sunday" },
      { ride_group_detailsid: 1001, date_day: "Monday" },
      { ride_group_detailsid: 1001, date_day: "Tuesday" },
      { ride_group_detailsid: 1001, date_day: "Wednesday" },
      { ride_group_detailsid: 1001, date_day: "Thursday" },
    ];

    // Children group details
    const liveTrackingChildrenGroups = [
      {
        parent_group_id: 1001, // Parent 1 child
        child_id: 1001,
        timing_from: "08:00:00",
        timing_to: "16:00:00", // 08:00am to 04:00pm
      },
      {
        parent_group_id: 1002, // Parent 2 child
        child_id: 1002,
        timing_from: "08:00:00",
        timing_to: "16:00:00", // 08:00am to 04:00pm
      }
    ];

    // Note: Plans not needed for live tracking testing

    try {
      console.log("🚀 Starting Live Tracking Test Data Seeding...");

      // Insert governorates (ignore if exists)
      await queryInterface.bulkInsert("governorate", defaultGovernments, { 
        ignoreDuplicates: true 
      });
      console.log("✅ Governorates seeded");

      // Insert cities (ignore if exists) 
      await queryInterface.bulkInsert("city", defaultCities, { 
        ignoreDuplicates: true 
      });
      console.log("✅ Cities seeded");

      // Insert test school
      await queryInterface.bulkInsert("schools", testSchool, { 
        ignoreDuplicates: true 
      });
      console.log("✅ Test school seeded");

      // Insert accounts
      await queryInterface.bulkInsert("account", liveTrackingAccounts, { 
        ignoreDuplicates: true 
      });
      console.log("✅ Live tracking accounts seeded");

      // Insert parents
      await queryInterface.bulkInsert("parent", liveTrackingParents, { 
        ignoreDuplicates: true 
      });
      console.log("✅ Live tracking parents seeded");

      // Insert drivers
      await queryInterface.bulkInsert("driver", liveTrackingDrivers, { 
        ignoreDuplicates: true 
      });
      console.log("✅ Live tracking drivers seeded");

      // Insert driver papers (APPROVED)
      await queryInterface.bulkInsert("driver_papers", liveTrackingDriverPapers, { 
        ignoreDuplicates: true 
      });
      console.log("✅ Live tracking driver papers seeded (APPROVED)");

      // Insert children
      await queryInterface.bulkInsert("child", liveTrackingChildren, { 
        ignoreDuplicates: true 
      });
      console.log("✅ Live tracking children seeded");

      // Insert ride groups
      await queryInterface.bulkInsert("ride_group", liveTrackingRideGroups, { 
        ignoreDuplicates: true 
      });
      console.log("✅ Live tracking ride groups seeded");

      // Insert parent group memberships
      await queryInterface.bulkInsert("parent_group", liveTrackingParentGroups, { 
        ignoreDuplicates: true 
      });
      console.log("✅ Live tracking parent groups seeded");

      // Insert group days (schedule)
      await queryInterface.bulkInsert("day_dates_group", liveTrackingGroupDays, { 
        ignoreDuplicates: true 
      });
      console.log("✅ Live tracking group days seeded");

      // Insert children group details
      await queryInterface.bulkInsert("child_group_details", liveTrackingChildrenGroups, { 
        ignoreDuplicates: true 
      });
      console.log("✅ Live tracking children group details seeded");

      console.log("\n🎉 LIVE TRACKING TEST DATA SEEDED SUCCESSFULLY!");
      console.log("\n📋 Test Accounts Created:");
      console.log("   🚗 Driver: ah@d1.com (password: password)");
      console.log("   👨‍👧‍👦 Parent 1: ah@p1.com (password: password) - ahmedP1");
      console.log("   👨‍👧‍👦 Parent 2: ah@p2.com (password: password) - ahmedP2");
      console.log("\n📍 Test Data:");
      console.log("   🏫 School: test school (ID: 200)");
      console.log("   🚐 Ride Group: test-school (ID: 1001) - PREMIUM");
      console.log("   👶 Children: fayroiz & jane (6 years old, grade 1)");
      console.log("   📅 Schedule: Sunday-Thursday, 08:00am-04:00pm");
      console.log("\n🗺️ Coordinates (Cairo):");
      console.log("   🚗 Driver Start: 29.987073938979787, 31.334552232417717");
      console.log("   🏠 Parent 1: 29.983118437109667, 31.321797582017027");
      console.log("   🏠 Parent 2: 29.9817868849066, 31.3263882582345");
      console.log("   🏫 School End: 29.984450411139598, 31.32561581359936");
      console.log("\n🚀 NEXT STEPS:");
      console.log("   1. Create ride instance via API: POST /api/ride/create");
      console.log("   2. Create chat room via API: GET /api/chat/ride-group/1001/room");
      console.log("   3. Test live tracking flow with Socket.IO");
      console.log("   4. Route: Driver → Parent 1 → Parent 2 → School");

    } catch (error) {
      console.error("❌ Error seeding live tracking test data:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      console.log("🗑️ Cleaning up Live Tracking Test Data...");

      // Delete in reverse order to handle foreign key constraints
      await queryInterface.bulkDelete("child_group_details", {
        child_id: [1001, 1002]
      });

      await queryInterface.bulkDelete("day_dates_group", {
        ride_group_detailsid: 1001
      });

      await queryInterface.bulkDelete("parent_group", {
        group_id: 1001
      });

      await queryInterface.bulkDelete("ride_group", {
        id: 1001
      });

      await queryInterface.bulkDelete("child", {
        id: [1001, 1002]
      });

      await queryInterface.bulkDelete("driver_papers", {
        driver_id: 101
      });

      await queryInterface.bulkDelete("driver", {
        id: 101
      });

      await queryInterface.bulkDelete("parent", {
        id: [101, 102]
      });

      await queryInterface.bulkDelete("account", {
        id: [1001, 1002, 1003]
      });

      await queryInterface.bulkDelete("schools", {
        id: 200
      });

      // Note: Not deleting governorate and city as they might be used by other data

      console.log("✅ Live Tracking Test Data cleanup completed!");

    } catch (error) {
      console.error("❌ Error cleaning up live tracking test data:", error);
      throw error;
    }
  }
};
