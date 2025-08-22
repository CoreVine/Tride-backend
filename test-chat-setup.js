#!/usr/bin/env node

/**
 * Quick Chat Test Setup Script
 * 
 * This script helps you test the chat system by providing ready-to-use
 * API calls and sample data.
 * 
 * Usage:
 * 1. Make sure your server is running
 * 2. Run: node test-chat-setup.js
 * 3. Copy and paste the API calls into your REST client (Postman, etc.)
 */

const SERVER_BASE_URL = process.env.SERVER_URL || 'http://localhost:3000';

console.log('🧪 TRIDE CHAT SYSTEM TEST SETUP');
console.log('='.repeat(50));
console.log(`Server: ${SERVER_BASE_URL}`);
console.log('');

// Test credentials from seeder
const testAccounts = {
  parent1: { email: 'ah250296@gmail.com', password: 'password' },
  parent2: { email: 'parent2@example.com', password: 'password' },
  parent3: { email: 'parent1@tride.com', password: 'password' },
  driver: { email: 'driver@example.com', password: 'password' },
  admin: { email: 'admin@tride.com', password: 'admin123' }
};

console.log('📊 TEST ACCOUNTS (from seeder):');
console.log(JSON.stringify(testAccounts, null, 2));
console.log('');

console.log('🚀 STEP-BY-STEP API TESTING:');
console.log('');

// Step 1: Login
console.log('1️⃣ LOGIN AS PARENT:');
console.log(`POST ${SERVER_BASE_URL}/api/auth/login`);
console.log('Content-Type: application/json');
console.log('');
console.log(JSON.stringify({
  email: testAccounts.parent1.email,
  password: testAccounts.parent1.password
}, null, 2));
console.log('');
console.log('💾 Save the JWT token from response!');
console.log('');

// Step 2: Get Chat Room
console.log('2️⃣ GET/CREATE CHAT ROOM:');
console.log(`GET ${SERVER_BASE_URL}/api/chat/ride-group/1/room`);
console.log('Authorization: Bearer YOUR_JWT_TOKEN_HERE');
console.log('');
console.log('💾 Save the room "_id" from response!');
console.log('');

// Step 3: Socket Connection
console.log('3️⃣ SOCKET.IO CONNECTION:');
console.log('```javascript');
console.log(`const io = require('socket.io-client');`);
console.log(`const socket = io('${SERVER_BASE_URL}', {`);
console.log(`  auth: { token: 'Bearer YOUR_JWT_TOKEN_HERE' }`);
console.log(`});`);
console.log('');
console.log(`socket.on('connect', () => {`);
console.log(`  console.log('✅ Connected to chat server');`);
console.log(`  socket.emit('join_room', 'YOUR_ROOM_ID_HERE');`);
console.log(`});`);
console.log('');
console.log(`socket.on('new_chat_message', (data) => {`);
console.log(`  console.log('📨 New message:', data);`);
console.log(`});`);
console.log('```');
console.log('');

// Step 4: Get Messages
console.log('4️⃣ GET MESSAGE HISTORY:');
console.log(`GET ${SERVER_BASE_URL}/api/chat/room/YOUR_ROOM_ID_HERE/messages?page=1`);
console.log('Authorization: Bearer YOUR_JWT_TOKEN_HERE');
console.log('');

// Step 5: Send Message
console.log('5️⃣ SEND TEST MESSAGE:');
console.log(`POST ${SERVER_BASE_URL}/api/chat/messages/YOUR_ROOM_ID_HERE/message`);
console.log('Authorization: Bearer YOUR_JWT_TOKEN_HERE');
console.log('Content-Type: application/json');
console.log('');
console.log(JSON.stringify({
  type: 'text',
  message: 'Hello everyone! This is a test message from Parent 1 🚗'
}, null, 2));
console.log('');

// Step 6: Login as Driver
console.log('6️⃣ LOGIN AS DRIVER:');
console.log(`POST ${SERVER_BASE_URL}/api/auth/login`);
console.log('Content-Type: application/json');
console.log('');
console.log(JSON.stringify({
  email: testAccounts.driver.email,
  password: testAccounts.driver.password
}, null, 2));
console.log('');

// Step 7: Driver joins chat
console.log('7️⃣ DRIVER JOINS CHAT:');
console.log(`GET ${SERVER_BASE_URL}/api/chat/ride-group/1/room`);
console.log('Authorization: Bearer DRIVER_JWT_TOKEN_HERE');
console.log('');

// Step 8: Driver sends message
console.log('8️⃣ DRIVER SENDS MESSAGE:');
console.log(`POST ${SERVER_BASE_URL}/api/chat/messages/YOUR_ROOM_ID_HERE/message`);
console.log('Authorization: Bearer DRIVER_JWT_TOKEN_HERE');
console.log('Content-Type: application/json');
console.log('');
console.log(JSON.stringify({
  type: 'text',
  message: 'Hi parents! I\\'m your driver. Ready for pickup at 7:30 AM! 🚙'
}, null, 2));
console.log('');

// Additional Tests
console.log('🧪 ADDITIONAL TESTS:');
console.log('');

console.log('📋 GET ALL USER\\'S CHAT ROOMS:');
console.log(`GET ${SERVER_BASE_URL}/api/chat/ride-group/rooms`);
console.log('Authorization: Bearer YOUR_JWT_TOKEN_HERE');
console.log('');

console.log('🆘 CREATE CUSTOMER SUPPORT ROOM:');
console.log(`POST ${SERVER_BASE_URL}/api/chat/customer-support/room`);
console.log('Authorization: Bearer YOUR_JWT_TOKEN_HERE');
console.log('');

console.log('💬 REPLY TO MESSAGE:');
console.log(`POST ${SERVER_BASE_URL}/api/chat/messages/YOUR_ROOM_ID_HERE/message`);
console.log('Authorization: Bearer YOUR_JWT_TOKEN_HERE');
console.log('Content-Type: application/json');
console.log('');
console.log(JSON.stringify({
  type: 'text',
  message: 'Thanks for the update!',
  reply_to: 'ORIGINAL_MESSAGE_ID_HERE'
}, null, 2));
console.log('');

console.log('🗑️ DELETE MESSAGE:');
console.log(`DELETE ${SERVER_BASE_URL}/api/chat/messages/MESSAGE_ID_HERE`);
console.log('Authorization: Bearer YOUR_JWT_TOKEN_HERE');
console.log('');

// Database queries
console.log('🗄️ USEFUL DATABASE QUERIES:');
console.log('');
console.log('-- Check ride groups:');
console.log('SELECT id, group_name, parent_creator_id, driver_id FROM ride_group;');
console.log('');
console.log('-- Check chat rooms:');
console.log('SELECT _id, ride_group_id, name, room_type FROM chatrooms;');
console.log('');
console.log('-- Check recent messages:');
console.log('SELECT _id, sender_id, sender_type, message, created_at FROM chatmessages ORDER BY created_at DESC LIMIT 5;');
console.log('');

// Test Ride Groups available
console.log('🏫 AVAILABLE RIDE GROUPS (from seeder):');
const testGroups = [
  { id: 1, name: 'Morning School Ride', creator: 'Ahmed Ali', driver: 'Seham Ahmed', status: 'Active' },
  { id: 2, name: 'Afternoon Activity Ride', creator: 'Ahmed Ali', driver: 'Seham Ahmed', status: 'Active' },
  { id: 3, name: 'Weekend Study Group', creator: 'Ahmed Ali', driver: 'Seham Ahmed', status: 'Active' },
];

testGroups.forEach(group => {
  console.log(`- Group ${group.id}: "${group.name}" (${group.status})`);
  console.log(`  Creator: ${group.creator}, Driver: ${group.driver}`);
  console.log(`  Test URL: ${SERVER_BASE_URL}/api/chat/ride-group/${group.id}/room`);
});
console.log('');

console.log('🎯 SUCCESS CHECKLIST:');
console.log('□ Can login as parent');
console.log('□ Can create/get chat room');
console.log('□ Can connect via Socket.IO'); 
console.log('□ Can join room via socket');
console.log('□ Can send messages');
console.log('□ Can receive real-time messages');
console.log('□ Can get message history');
console.log('□ Driver can join same chat');
console.log('□ Multiple users in same room');
console.log('');

console.log('🚨 TROUBLESHOOTING:');
console.log('- 404 errors: Make sure server is running and routes are correct');
console.log('- 401 errors: Check JWT token format and user verification');
console.log('- Socket issues: Verify token and ensure join_room was emitted');
console.log('- No real-time messages: Check socket connection and room joining');
console.log('');

console.log('🎉 Happy Testing!');
console.log('Need help? Check CHAT_TEST_SETUP_GUIDE.md for detailed instructions.');
