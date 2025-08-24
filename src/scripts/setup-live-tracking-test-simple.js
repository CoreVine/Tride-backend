/**
 * Simple Live Tracking Test Setup Script
 * 
 * This script creates only the chat room for live tracking testing.
 * It works even if ride_instance table has schema issues.
 * 
 * Usage: node src/scripts/setup-live-tracking-test-simple.js
 */

const RideGroupRepository = require("../data-access/rideGroup");
const ChatRoom = require("../mongo-model/ChatRoom");
const sequelizeService = require("../services/sequelize.service");
const mongodbService = require("../config/monogodb");

async function setupLiveTrackingTestSimple() {
  try {
    console.log("🚀 Setting up Simple Live Tracking Test Environment...");

    // Connect to databases
    await sequelizeService.init();
    console.log("✅ MySQL connected");
    
    await mongodbService.init();
    console.log("✅ MongoDB connected");

    // 1. Check if ride group exists
    const rideGroup = await RideGroupRepository.findById(1001);
    if (!rideGroup) {
      throw new Error("❌ Ride group 1001 not found. Please run the live tracking seeder first.");
    }

    console.log(`✅ Found ride group: ${rideGroup.group_name} (ID: ${rideGroup.id})`);

    // 2. Create chat room for ride group
    console.log("💬 Creating chat room...");
    
    // Check if chat room already exists
    const existingChatRoom = await ChatRoom.findOne({
      room_type: "ride_group",
      ride_group_id: 1001
    });

    let chatRoom;
    if (existingChatRoom) {
      console.log(`ℹ️ Chat room already exists (ID: ${existingChatRoom._id})`);
      chatRoom = existingChatRoom;
    } else {
      chatRoom = new ChatRoom({
        ride_group_id: 1001,
        room_type: "ride_group",
        name: "Chat Room for test-school",
        participants: [
          {
            user_id: 101, // driver
            user_type: "driver", 
            name: "ahmed driver"
          }
        ],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      await chatRoom.save();
      console.log(`✅ Created chat room (ID: ${chatRoom._id})`);
    }

    // 3. Display test information
    console.log("\n🎉 SIMPLE LIVE TRACKING TEST ENVIRONMENT READY!");
    console.log("\n📋 Test Configuration:");
    console.log("═══════════════════════════════════════════════════");
    console.log(`   🏫 School: test school (ID: 200)`);
    console.log(`   🚐 Ride Group: ${rideGroup.group_name} (ID: ${rideGroup.id})`);
    console.log(`   🚗 Driver: ahmed driver (ID: 101)`);
    console.log(`   👥 Parents: ahmedP1 (ID: 101), ahmedP2 (ID: 102)`);
    console.log(`   👶 Children: fayroiz, jane`);
    console.log(`   💬 Chat Room: ${chatRoom._id}`);
    
    console.log("\n📍 Route Coordinates:");
    console.log("═══════════════════════════════════════════════════");
    console.log("   🚗 Driver Start: 29.987073938979787, 31.334552232417717");
    console.log("   🏠 Parent 1 (ahmedP1): 29.983118437109667, 31.321797582017027");
    console.log("   🏠 Parent 2 (ahmedP2): 29.9817868849066, 31.3263882582345");
    console.log("   🏫 School End: 29.984450411139598, 31.32561581359936");

    console.log("\n🔑 Test Accounts:");
    console.log("═══════════════════════════════════════════════════");
    console.log("   🚗 Driver: ah@d1.com (password: password)");
    console.log("   👨‍👧‍👦 Parent 1: ah@p1.com (password: password)");
    console.log("   👨‍👧‍👦 Parent 2: ah@p2.com (password: password)");

    console.log("\n🧪 Testing Flow (Manual Ride Creation):");
    console.log("═══════════════════════════════════════════════════");
    console.log("   1. Login as driver (ah@d1.com)");
    console.log("   2. Create ride via API: POST /api/ride/create");
    console.log("      Body: { \"type\": \"to_school\", \"ride_group_id\": 1001 }");
    console.log("   3. Connect to Socket.IO with driver token");
    console.log("   4. Emit: driver_join_ride with ride_group_id: 1001");
    console.log("   5. Login as parents and connect to Socket.IO");
    console.log("   6. Emit: parent_watch_ride with ride_group_id: 1001");
    console.log("   7. Start live tracking with location updates");

    console.log("\n🌐 API Endpoints for Testing:");
    console.log("═══════════════════════════════════════════════════");
    console.log("   🔐 Login: POST /api/auth/login");
    console.log("   🚗 Create Ride: POST /api/ride/create");
    console.log("   💬 Chat Room: GET /api/chat/ride-group/1001/room");
    console.log("   📍 Socket.IO: ws://localhost:4000");
    console.log("   🚗 Driver Groups: GET /api/driver/my-ride-groups");

    console.log("\n✨ Simple Live Tracking Test Environment Setup Complete!");

  } catch (error) {
    console.error("❌ Error setting up simple live tracking test:", error);
    process.exit(1);
  } finally {
    // Close database connections
    if (sequelizeService.connection) {
      await sequelizeService.connection.close();
      console.log("📝 MySQL connection closed");
    }
    
    // Close MongoDB connection
    const mongoose = require("mongoose");
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("📝 MongoDB connection closed");
    }
  }
}

// Run the setup if called directly
if (require.main === module) {
  setupLiveTrackingTestSimple();
}

module.exports = setupLiveTrackingTestSimple;
