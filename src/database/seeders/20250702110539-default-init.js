"use strict";
const bcrypt = require("bcryptjs");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const defaultGovernments = [{ id: 1, governorate_name: "Giza" }];

    const defaultCities = [
      { id: 1, name: "El-Shikh Zayed", governorate_id: 1 },
      { id: 2, name: "6 Of Oct", governorate_id: 1 },
      { id: 3, name: "Oct Gardens", governorate_id: 1 },
    ];

    const defaultSchools = [
      {
        id: 1,
        school_name: "Hakim International School in Egypt",
        city_id: 1,
        lat: 30.031262,
        lng: 30.973565,
      },
      {
        id: 2,
        school_name: "American International School in Egypt",
        city_id: 1,
        lat: 30.033815,
        lng: 30.987873,
      },
      {
        id: 3,
        school_name: "British School Egypt",
        city_id: 1,
        lat: 30.039046,
        lng: 30.958061,
      },
      {
        id: 4,
        school_name: "Skills British International School S.G.B",
        city_id: 1,
        lat: 30.039092,
        lng: 31.011934,
      },
      {
        id: 5,
        school_name: "Modern Infinity School",
        city_id: 1,
        lat: 30.049386,
        lng: 31.00392,
      },
      {
        id: 6,
        school_name: "New Vision International School",
        city_id: 1,
        lat: 30.060459,
        lng: 30.960389,
      },
      {
        id: 7,
        school_name: "Green Heaven",
        city_id: 1,
        lat: 30.039631,
        lng: 31.021004,
      },
      {
        id: 8,
        school_name:
          "Beverly Hills International School British / English System",
        city_id: 1,
        lat: 30.056828,
        lng: 30.947518,
      },
      {
        id: 9,
        school_name: "Ethos International School",
        city_id: 1,
        lat: 30.043638,
        lng: 31.023997,
      },
      {
        id: 10,
        school_name: "Andalusian Language School",
        city_id: 1,
        lat: 30.01765,
        lng: 30.909415,
      },
      {
        id: 11,
        school_name: "Glorious Language School",
        city_id: 1,
        lat: 30.023149,
        lng: 31.020459,
      },
      {
        id: 12,
        school_name: "Wise School",
        city_id: 1,
        lat: 30.031296,
        lng: 30.97348,
      },
      {
        id: 13,
        school_name: "Smart Vision International School",
        city_id: 2,
        lat: 29.969298,
        lng: 30.972234,
      },
      {
        id: 14,
        school_name: "City International School",
        city_id: 2,
        lat: 29.986699,
        lng: 30.975932,
      },
      {
        id: 15,
        school_name: "Highlands International School",
        city_id: 2,
        lat: 29.988774,
        lng: 30.958634,
      },
      {
        id: 16,
        school_name: "Ethos International",
        city_id: 2,
        lat: 30.043775,
        lng: 31.023623,
      },
      {
        id: 17,
        school_name: "Al-Rowad Private School",
        city_id: 2,
        lat: 29.935397,
        lng: 30.895022,
      },
      {
        id: 18,
        school_name: "Beverly Hills German School",
        city_id: 2,
        lat: 30.056829,
        lng: 30.947514,
      },
      {
        id: 19,
        school_name: "Franco City International School",
        city_id: 2,
        lat: 29.987684,
        lng: 30.976823,
      },
      {
        id: 20,
        school_name: "Heritage International School",
        city_id: 2,
        lat: 29.982942,
        lng: 30.99553,
      },
      {
        id: 21,
        school_name: "Al-Huda International",
        city_id: 2,
        lat: 29.981706,
        lng: 30.975201,
      },
      {
        id: 22,
        school_name: "Royal International Language School",
        city_id: 2,
        lat: 29.956777,
        lng: 30.930119,
      },
      {
        id: 23,
        school_name: "Smart Vision School",
        city_id: 2,
        lat: 30.054749,
        lng: 30.984725,
      },
      {
        id: 24,
        school_name: "Generation 2000",
        city_id: 2,
        lat: 29.966206,
        lng: 30.943212,
      },
      {
        id: 25,
        school_name: "New Monier House School",
        city_id: 2,
        lat: 30.009323,
        lng: 31.005332,
      },
      {
        id: 26,
        school_name: "Al-Radwa Modern Private School",
        city_id: 2,
        lat: 29.978815,
        lng: 30.944426,
      },
      {
        id: 27,
        school_name: "Cairo Language School",
        city_id: 2,
        lat: 29.96639,
        lng: 30.934919,
      },
      {
        id: 28,
        school_name: "Al-Khalil Private Language School",
        city_id: 2,
        lat: 29.978365,
        lng: 30.930777,
      },
      {
        id: 29,
        school_name: "Delta Language School",
        city_id: 2,
        lat: 29.985226,
        lng: 30.985174,
      },
      {
        id: 30,
        school_name: "Al-Nasr Language School",
        city_id: 2,
        lat: 29.984763,
        lng: 30.979978,
      },
      {
        id: 31,
        school_name: "Umm Al-Mu'minin Private School",
        city_id: 2,
        lat: 29.964909,
        lng: 30.942652,
      },
      {
        id: 32,
        school_name: "Badr Tigers School",
        city_id: 2,
        lat: 29.950713,
        lng: 30.919007,
      },
      {
        id: 33,
        school_name: "Egyptian Language Schools",
        city_id: 2,
        lat: 29.957374,
        lng: 30.931965,
      },
      {
        id: 34,
        school_name: "Al-Huda Private School",
        city_id: 2,
        lat: 29.981719,
        lng: 30.975174,
      },
      {
        id: 35,
        school_name: "Riyadh Al-Salihin Private School",
        city_id: 2,
        lat: 29.978405,
        lng: 30.945411,
      },
      {
        id: 36,
        school_name: "Choueifat International School",
        city_id: 3,
        lat: 29.968172,
        lng: 31.036423,
      },
      {
        id: 37,
        school_name: "Dream International School",
        city_id: 3,
        lat: 29.975691,
        lng: 31.052864,
      },
      {
        id: 38,
        school_name: "Masters Language School",
        city_id: 3,
        lat: 29.946239,
        lng: 31.046699,
      },
      {
        id: 39,
        school_name: "Bab Al Shams Language School",
        city_id: 3,
        lat: 29.955027,
        lng: 31.053196,
      },
      {
        id: 40,
        school_name: "Orascom Language School",
        city_id: 3,
        lat: 29.946442,
        lng: 31.01493,
      },
      {
        id: 41,
        school_name: "Al-Ahlam Ideal Educational Private School",
        city_id: 3,
        lat: 29.975619,
        lng: 31.052801,
      },
    ];

    const defaultAccounts = [
      {
        id: 1,
        email: 'admin@tride.com',
        password: await bcrypt.hash("admin123", 8),
        account_type: 'admin',
        is_verified: true,
        auth_method: 'email'
      },
      {
        id: 2,
        email: "ah250296@gmail.com",
        password: await bcrypt.hash("password", 8),
        account_type: "parent",
        is_verified: true,
        auth_method: "email",
      },
      {
        id: 3,
        email: "driver@example.com",
        password: await bcrypt.hash("password", 8),
        account_type: "driver",
        is_verified: true,
        auth_method: "email",
      },
      {
        id: 4,
        email: "parent2@example.com",
        password: await bcrypt.hash("password", 8),
        account_type: "parent",
        is_verified: true,
        auth_method: "email",
      },
      {
        id: 5,
        email: "parent1@tride.com",
        password: await bcrypt.hash("password", 8),
        account_type: "parent",
        is_verified: true,
        auth_method: "email",
      },
      {
        id: 6,
        email: "parent2@tride.com",
        password: await bcrypt.hash("password", 8),
        account_type: "parent",
        is_verified: true,
        auth_method: "email",
      },
      {
        id: 7,
        email: "parent3@tride.com",
        password: await bcrypt.hash("password", 8),
        account_type: "parent",
        is_verified: true,
        auth_method: "email",
      },
      {
        id: 8,
        email: "parent4@tride.com",
        password: await bcrypt.hash("password", 8),
        account_type: "parent",
        is_verified: true,
        auth_method: "email",
      },
      {
        id: 9,
        email: "parent5@tride.com",
        password: await bcrypt.hash("password", 8),
        account_type: "parent",
        is_verified: true,
        auth_method: "email",
      },
      {
        id: 10,
        email: "parent6@tride.com",
        password: await bcrypt.hash("password", 8),
        account_type: "parent",
        is_verified: true,
        auth_method: "email",
      },
    ];

    const defaultParents = [
      {
        id: 1,
        account_id: 2,
        name: "Ahmed Ali",
        profile_pic:
          "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg",
        phone: "+201234567890",
        google_place_id: "ChIJd8BlQ2BZwokRAFUEcm_qrcA",
        lat: 30.0444,
        lng: 31.2357,
        formatted_address: "123 Nile St, Cairo, Egypt",
        city_id: 1,
        gender: "male",
        front_side_nic: "https://example.com/front_nic1.jpg",
        back_side_nic: "https://example.com/back_nic1.jpg",
        face_auth_complete: true,
        documents_approved: true,
        documents_approval_date: new Date(),
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        account_id: 4,
        name: "Fatima Hassan",
        profile_pic:
          "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg",
        phone: "+201234567891",
        google_place_id: "ChIJd8BlQ2BZwokRAFUEcm_qrcB",
        lat: 30.0534,
        lng: 31.2447,
        formatted_address: "456 Cairo St, Giza, Egypt",
        city_id: 2,
        gender: "female",
        front_side_nic: "https://example.com/front_nic2.jpg",
        back_side_nic: "https://example.com/back_nic2.jpg",
        face_auth_complete: true,
        documents_approved: true,
        documents_approval_date: new Date(),
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        account_id: 5,
        name: "Mohamed Ibrahim",
        profile_pic:
          "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg",
        phone: "+201234567892",
        google_place_id: "ChIJd8BlQ2BZwokRAFUEcm_qrcC",
        lat: 30.0344,
        lng: 30.9756,
        formatted_address: "789 Sheikh Zayed St, Giza, Egypt",
        city_id: 1,
        gender: "male",
        front_side_nic: "https://example.com/front_nic3.jpg",
        back_side_nic: "https://example.com/back_nic3.jpg",
        face_auth_complete: true,
        documents_approved: true,
        documents_approval_date: new Date(),
        created_at: now,
        updated_at: now,
      },
      {
        id: 4,
        account_id: 6,
        name: "Amira Mahmoud",
        profile_pic:
          "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg",
        phone: "+201234567893",
        google_place_id: "ChIJd8BlQ2BZwokRAFUEcm_qrcD",
        lat: 29.9744,
        lng: 30.9834,
        formatted_address: "321 October St, 6th of October, Egypt",
        city_id: 2,
        gender: "female",
        front_side_nic: "https://example.com/front_nic4.jpg",
        back_side_nic: "https://example.com/back_nic4.jpg",
        face_auth_complete: true,
        documents_approved: true,
        documents_approval_date: new Date(),
        created_at: now,
        updated_at: now,
      },
      {
        id: 5,
        account_id: 7,
        name: "Youssef Omar",
        profile_pic:
          "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg",
        phone: "+201234567894",
        google_place_id: "ChIJd8BlQ2BZwokRAFUEcm_qrcE",
        lat: 29.9644,
        lng: 31.0456,
        formatted_address: "654 Gardens Ave, October Gardens, Egypt",
        city_id: 3,
        gender: "male",
        front_side_nic: "https://example.com/front_nic5.jpg",
        back_side_nic: "https://example.com/back_nic5.jpg",
        face_auth_complete: true,
        documents_approved: true,
        documents_approval_date: new Date(),
        created_at: now,
        updated_at: now,
      },
      {
        id: 6,
        account_id: 8,
        name: "Nadia Farouk",
        profile_pic:
          "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg",
        phone: "+201234567895",
        google_place_id: "ChIJd8BlQ2BZwokRAFUEcm_qrcF",
        lat: 30.0544,
        lng: 30.9656,
        formatted_address: "987 Zayed Heights, Sheikh Zayed, Egypt",
        city_id: 1,
        gender: "female",
        front_side_nic: "https://example.com/front_nic6.jpg",
        back_side_nic: "https://example.com/back_nic6.jpg",
        face_auth_complete: true,
        documents_approved: true,
        documents_approval_date: new Date(),
        created_at: now,
        updated_at: now,
      },
      {
        id: 7,
        account_id: 9,
        name: "Khaled Samir",
        profile_pic:
          "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg",
        phone: "+201234567896",
        google_place_id: "ChIJd8BlQ2BZwokRAFUEcm_qrcG",
        lat: 29.9844,
        lng: 30.9734,
        formatted_address: "456 Central Axis, 6th of October, Egypt",
        city_id: 2,
        gender: "male",
        front_side_nic: "https://example.com/front_nic7.jpg",
        back_side_nic: "https://example.com/back_nic7.jpg",
        face_auth_complete: true,
        documents_approved: true,
        documents_approval_date: new Date(),
        created_at: now,
        updated_at: now,
      },
      {
        id: 8,
        account_id: 10,
        name: "Mona Tawfik",
        profile_pic:
          "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg",
        phone: "+201234567897",
        google_place_id: "ChIJd8BlQ2BZwokRAFUEcm_qrcH",
        lat: 29.9744,
        lng: 31.0556,
        formatted_address: "123 Green Park, October Gardens, Egypt",
        city_id: 3,
        gender: "female",
        front_side_nic: "https://example.com/front_nic8.jpg",
        back_side_nic: "https://example.com/back_nic8.jpg",
        face_auth_complete: true,
        documents_approved: true,
        documents_approval_date: new Date(),
        created_at: now,
        updated_at: now,
      },
    ];

    const defaultDrivers = [
      {
        id: 1,
        account_id: 3,
        name: "Seham Ahmed",
        profile_pic:
          "https://images.pexels.com/photos/712513/pexels-photo-712513.jpeg",
        phone: "+201234567890",
        license_number: "1234567890",
        lat: 30.0444,
        lng: 31.2357,
        formatted_address: "123 Nile St, Cairo, Egypt",
        city_id: 1,
        gender: "male",
        created_at: now,
        updated_at: now,
      },
    ];

    const defaultDriverPapers = [
      {
        id: 1,
        driver_id: 1,
        front_side_national_url: "https://example.com/front_national1.jpg",
        back_side_national_url: "https://example.com/back_national1.jpg",
        car_model: "Toyota Corolla",
        car_model_year: 2018,
        driver_license_url: "https://example.com/driver_license1.jpg",
        driver_license_exp_date: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
        car_license_url: "https://example.com/car_license1.jpg",
        car_license_exp_date: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
        approved: true,
        approval_date: new Date(),
        face_auth_complete: 1,
      }
    ];

    const defaultChildren = [
      {
        id: 1,
        name: "Ali",
        profile_pic:
          "https://images.pexels.com/photos/35537/child-children-girl-happy.jpg",
        grade: "1st",
        gender: "male",
        parent_id: 1,
      },
      {
        id: 2,
        name: "Omar",
        profile_pic:
          "https://images.pexels.com/photos/1104007/pexels-photo-1104007.jpeg",
        grade: "2nd",
        gender: "male",
        parent_id: 1,
      },
      {
        id: 3,
        name: "Fatima",
        profile_pic:
          "https://images.pexels.com/photos/1462636/pexels-photo-1462636.jpeg",
        grade: "3rd",
        gender: "female",
        parent_id: 1,
      },
      {
        id: 4,
        name: "Layla",
        profile_pic:
          "https://images.pexels.com/photos/1416736/pexels-photo-1416736.jpeg",
        grade: "1st",
        gender: "female",
        parent_id: 1,
      },
      {
        id: 5,
        name: "Khaled",
        profile_pic:
          "https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg",
        grade: "4th",
        gender: "male",
        parent_id: 1,
      },
      {
        id: 6,
        name: "Sara",
        profile_pic:
          "https://images.pexels.com/photos/1001914/pexels-photo-1001914.jpeg",
        grade: "2nd",
        gender: "female",
        parent_id: 1,
      },
      {
        id: 7,
        name: "Yasmin",
        profile_pic:
          "https://images.pexels.com/photos/1462636/pexels-photo-1462636.jpeg",
        grade: "1st",
        gender: "female",
        parent_id: 2,
      },
      {
        id: 8,
        name: "Mahmoud",
        profile_pic:
          "https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg",
        grade: "3rd",
        gender: "male",
        parent_id: 2,
      },
      {
        id: 9,
        name: "Nour",
        profile_pic:
          "https://images.pexels.com/photos/1001914/pexels-photo-1001914.jpeg",
        grade: "2nd",
        gender: "female",
        parent_id: 2,
      },
    ];

    const defaultGroups = [
      {
        id: 1,
        parent_creator_id: 1,
        group_name: "Morning School Ride",
        created_at: now,
        updated_at: now,
        driver_id: 1,
        school_id: 1,
        current_seats_taken: 3,
        invite_code: "ABC12345",
        group_type: "regular",
      },
      {
        id: 2,
        parent_creator_id: 1,
        group_name: "Afternoon Activity Ride",
        created_at: now,
        updated_at: now,
        driver_id: 1,
        school_id: 1,
        current_seats_taken: 2,
        invite_code: "DEF67890",
        group_type: "regular",
      },
      {
        id: 3,
        parent_creator_id: 1,
        group_name: "Weekend Study Group",
        created_at: now,
        updated_at: now,
        driver_id: 1,
        school_id: 1,
        current_seats_taken: 1,
        invite_code: "GHI12345",
        group_type: "regular",
      },
      {
        id: 4,
        parent_creator_id: 1,
        group_name: "Evening Extra Classes",
        created_at: now,
        updated_at: now,
        driver_id: null,
        school_id: 1,
        current_seats_taken: 2,
        invite_code: null,
        group_type: "regular",
      },
      {
        id: 5,
        parent_creator_id: 2,
        group_name: "Morning School Transport",
        created_at: now,
        updated_at: now,
        driver_id: null,
        school_id: 1,
        current_seats_taken: 2,
        invite_code: null,
        group_type: "regular",
      },
      {
        id: 6,
        parent_creator_id: 1,
        group_name: "Past Morning Ride",
        created_at: now,
        updated_at: now,
        driver_id: null,
        school_id: 1,
        current_seats_taken: 1,
        invite_code: null,
        group_type: "regular",
      },
      {
        id: 7,
        parent_creator_id: 1,
        group_name: "Old Afternoon Ride",
        created_at: now,
        updated_at: now,
        driver_id: null,
        school_id: 1,
        current_seats_taken: 1,
        invite_code: null,
        group_type: "regular",
      },
    ];

    const defaultParentGroup = [
      {
        id: 1,
        group_id: 1,
        parent_id: 1,
        home_lat: 30.0444,
        home_lng: 31.2357,
        current_seats_taken: 3,
        status: "new",
      },
      {
        id: 2,
        group_id: 2,
        parent_id: 1,
        home_lat: 30.0444,
        home_lng: 31.2357,
        current_seats_taken: 2,
        status: "pending"
      },
      {
        id: 3,
        group_id: 3,
        parent_id: 1,
        home_lat: 30.0444,
        home_lng: 31.2357,
        current_seats_taken: 1,
        status: "ready"
      },
      {
        id: 4,
        group_id: 4,
        parent_id: 1,
        home_lat: 30.0444,
        home_lng: 31.2357,
        current_seats_taken: 2,
        status: "active"
      },
      {
        id: 5,
        group_id: 5,
        parent_id: 1,
        home_lat: 30.0444,
        home_lng: 31.2357,
        current_seats_taken: 2,
        status: "inactive"
      },
      {
        id: 6,
        group_id: 6,
        parent_id: 1,
        home_lat: 30.0444,
        home_lng: 31.2357,
        current_seats_taken: 1,
        status: "removed"
      },
      {
        id: 7,
        group_id: 7,
        parent_id: 1,
        home_lat: 30.0444,
        home_lng: 31.2357,
        current_seats_taken: 1,
        status: "expired"
      },
    ];

    const defaultGroupDays = [
      {
        ride_group_detailsid: 1,
        date_day: "Sunday",
      },
      {
        ride_group_detailsid: 1,
        date_day: "Monday",
      },
      {
        ride_group_detailsid: 1,
        date_day: "Tuesday",
      },
      {
        ride_group_detailsid: 1,
        date_day: "Wednesday",
      },
      {
        ride_group_detailsid: 2,
        date_day: "Monday",
      },
      {
        ride_group_detailsid: 2,
        date_day: "Wednesday",
      },
      {
        ride_group_detailsid: 2,
        date_day: "Thursday",
      },
      {
        ride_group_detailsid: 3,
        date_day: "Friday",
      },
      {
        ride_group_detailsid: 3,
        date_day: "Saturday",
      },
      {
        ride_group_detailsid: 4,
        date_day: "Tuesday",
      },
      {
        ride_group_detailsid: 4,
        date_day: "Thursday",
      },
      {
        ride_group_detailsid: 5,
        date_day: "Sunday",
      },
      {
        ride_group_detailsid: 5,
        date_day: "Tuesday",
      },
      {
        ride_group_detailsid: 5,
        date_day: "Thursday",
      },
      {
        ride_group_detailsid: 6,
        date_day: "Monday",
      },
      {
        ride_group_detailsid: 6,
        date_day: "Wednesday",
      },
      {
        ride_group_detailsid: 7,
        date_day: "Tuesday",
      },
      {
        ride_group_detailsid: 7,
        date_day: "Thursday",
      },
    ];

    const defaultChildrenGroups = [
      {
        parent_group_id: 1,
        child_id: 1,
        timing_from: "08:00:00",
        timing_to: "14:00:00",
      },
      {
        parent_group_id: 1,
        child_id: 2,
        timing_from: "08:15:00",
        timing_to: "14:15:00",
      },
      {
        parent_group_id: 1,
        child_id: 3,
        timing_from: "08:30:00",
        timing_to: "14:30:00",
      },
      {
        parent_group_id: 2,
        child_id: 4,
        timing_from: "15:00:00",
        timing_to: "17:00:00",
      },
      {
        parent_group_id: 2,
        child_id: 5,
        timing_from: "15:15:00",
        timing_to: "17:15:00",
      },
      {
        parent_group_id: 3,
        child_id: 6,
        timing_from: "10:00:00",
        timing_to: "13:00:00",
      },
      {
        parent_group_id: 4,
        child_id: 4,
        timing_from: "16:00:00",
        timing_to: "18:00:00",
      },
      {
        parent_group_id: 4,
        child_id: 5,
        timing_from: "16:15:00",
        timing_to: "18:15:00",
      },
      {
        parent_group_id: 5,
        child_id: 1,
        timing_from: "07:30:00",
        timing_to: "13:30:00",
      },
      {
        parent_group_id: 5,
        child_id: 2,
        timing_from: "07:45:00",
        timing_to: "13:45:00",
      },
      {
        parent_group_id: 6,
        child_id: 3,
        timing_from: "08:00:00",
        timing_to: "14:00:00",
      },
      {
        parent_group_id: 7,
        child_id: 4,
        timing_from: "15:00:00",
        timing_to: "17:00:00",
      },
    ];

    // Set up subscriptions with different plans for each group
    const defaultSubscriptions = [
      {
        id: 1,
        parent_id: 1,
        ride_group_id: 1,
        current_seats_taken: 3,
        pickup_days_count: 4,
        started_at: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 15
        ),
        valid_until: new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          now.getDate() - 15
        ),
        plan_id: 1,
        total_amount: 1250.0,
        status: "new",
      },
      {
        id: 2,
        parent_id: 1,
        ride_group_id: 2,
        current_seats_taken: 2,
        pickup_days_count: 3,
        started_at: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        valid_until: new Date(now.getFullYear(), now.getMonth() + 3, 1),
        plan_id: 2,
        total_amount: 3600.0,
        status: "pending",
      },
      {
        id: 3,
        parent_id: 1,
        ride_group_id: 3,
        current_seats_taken: 1,
        pickup_days_count: 2,
        started_at: new Date(now.getFullYear(), now.getMonth() - 2, 15),
        valid_until: new Date(now.getFullYear(), now.getMonth() + 6, 15),
        plan_id: 3,
        total_amount: 4800.0,
        status: "paid",
      },
      {
        id: 4,
        parent_id: 1,
        ride_group_id: 4,
        current_seats_taken: 2,
        pickup_days_count: 2,
        started_at: now,
        valid_until: null,
        plan_id: 1,
        total_amount: 0,
        status: "new",
      },
      {
        id: 5,
        parent_id: 1,
        ride_group_id: 5,
        current_seats_taken: 2,
        pickup_days_count: 3,
        started_at: now,
        valid_until: null,
        plan_id: 1,
        total_amount: 0,
        status: "new",
      },
      {
        id: 6,
        parent_id: 1,
        ride_group_id: 6,
        current_seats_taken: 1,
        pickup_days_count: 4,
        started_at: new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate()
        ),
        valid_until: new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate()
        ),
        plan_id: 1,
        total_amount: 800.0,
        status: "new",
      },
      {
        id: 7,
        parent_id: 1,
        ride_group_id: 7,
        current_seats_taken: 1,
        pickup_days_count: 3,
        started_at: new Date(
          now.getFullYear(),
          now.getMonth() - 4,
          now.getDate()
        ),
        valid_until: new Date(
          now.getFullYear(),
          now.getMonth() - 2,
          now.getDate()
        ),
        plan_id: 1,
        total_amount: 600.0,
        status: "pending",
      },
    ];

    const defaultPayments = [
      {
        paymob_receipt_id:
          "PMB" + Math.floor(10000000 + Math.random() * 90000000),
        paid_at: new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 15
        ),
        amount: 1250.0,
        parent_subscription_id: 1,
      },
      {
        paymob_receipt_id:
          "PMB" + Math.floor(10000000 + Math.random() * 90000000),
        paid_at: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        amount: 3600.0,
        parent_subscription_id: 2,
      },
      {
        paymob_receipt_id:
          "PMB" + Math.floor(10000000 + Math.random() * 90000000),
        paid_at: new Date(now.getFullYear(), now.getMonth() - 2, 15),
        amount: 4800.0,
        parent_subscription_id: 3,
      },
    ];

    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.bulkDelete("payment_history", null, { transaction });
      await queryInterface.bulkDelete("parent_group_subscription", null, {
        transaction,
      });
      await queryInterface.bulkDelete("child_group_details", null, {
        transaction,
      });
      await queryInterface.bulkDelete("day_dates_group", null, { transaction });
      await queryInterface.bulkDelete("parent_group", null, { transaction });
      await queryInterface.bulkDelete("ride_child_delivered", null, {
        transaction,
      });
      await queryInterface.bulkDelete("ride_history", null, { transaction });
      await queryInterface.bulkDelete("ride_instance", null, { transaction });
      await queryInterface.bulkDelete("ride_group", null, { transaction });
      await queryInterface.bulkDelete("child", null, { transaction });
      await queryInterface.bulkDelete("driver_papers", null, { transaction });
      await queryInterface.bulkDelete("driver_payment", null, { transaction });
      await queryInterface.bulkDelete("driver", null, { transaction });
      await queryInterface.bulkDelete("parent", null, { transaction });
      await queryInterface.bulkDelete("account", null, { transaction });
      await queryInterface.bulkDelete("schools", null, { transaction });
      await queryInterface.bulkDelete("city", null, { transaction });
      await queryInterface.bulkDelete("governorate", null, { transaction });
      await queryInterface.bulkDelete('admin', null, {transaction});

      await queryInterface.bulkInsert("governorate", defaultGovernments, {
        transaction,
      });
      await queryInterface.bulkInsert("city", defaultCities, { transaction });
      await queryInterface.bulkInsert("schools", defaultSchools, {
        transaction,
      });
      await queryInterface.bulkInsert("account", defaultAccounts, {
        transaction,
      });
      // Insert admin profile linked to the account
      await queryInterface.bulkInsert('admin', [{
        account_id: 1,
        first_name: 'Super',
        last_name: 'Admin',
        language: 'en',
        role_id: 1, // super admin role
        created_at: Sequelize.fn('NOW'),
        updated_at: Sequelize.fn('NOW')
      }], { transaction });
      await queryInterface.bulkInsert("parent", defaultParents, {
        transaction,
      });
      await queryInterface.bulkInsert("driver", defaultDrivers, {
        transaction,
      });
      await queryInterface.bulkInsert("driver_papers", defaultDriverPapers, { transaction });
      await queryInterface.bulkInsert("child", defaultChildren, {
        transaction,
      });
      await queryInterface.bulkInsert("ride_group", defaultGroups, {
        transaction,
      });
      await queryInterface.bulkInsert("parent_group", defaultParentGroup, {
        transaction,
      });
      await queryInterface.bulkInsert("day_dates_group", defaultGroupDays, {
        transaction,
      });
      await queryInterface.bulkInsert(
        "child_group_details",
        defaultChildrenGroups,
        { transaction }
      );
      await queryInterface.bulkInsert(
        "parent_group_subscription",
        defaultSubscriptions,
        { transaction }
      );
      await queryInterface.bulkInsert("payment_history", defaultPayments, {
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error("Seeder error:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("payment_history", null, {});
    await queryInterface.bulkDelete("parent_group_subscription", null, {});
    await queryInterface.bulkDelete("child_group_details", null, {});
    await queryInterface.bulkDelete("day_dates_group", null, {});
    await queryInterface.bulkDelete("parent_group", null, {});
    await queryInterface.bulkDelete("ride_child_delivered", null, {});
    await queryInterface.bulkDelete("ride_history", null, {});
    await queryInterface.bulkDelete("ride_instance", null, {});
    await queryInterface.bulkDelete("ride_group", null, {});
    await queryInterface.bulkDelete("child", null, {});
    await queryInterface.bulkDelete("driver_papers", null, {});
    await queryInterface.bulkDelete("driver_payment", null, {});
    await queryInterface.bulkDelete("driver", null, {});
    await queryInterface.bulkDelete("parent", null, {});
    await queryInterface.bulkDelete("admin", null, {});
    await queryInterface.bulkDelete("account", null, {});
    await queryInterface.bulkDelete("schools", null, {});
    await queryInterface.bulkDelete("city", null, {});
    await queryInterface.bulkDelete("governorate", null, {});
  },
};