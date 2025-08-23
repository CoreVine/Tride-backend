# 🧪 Chat System Test Setup Guide

## 📋 Overview
This guide will help you create test data to test the complete chat flow for ride groups, including users, ride groups, and chat rooms.

---

## 🚀 Method 1: Use Existing Seeder Data (Recommended)

The easiest way is to use the existing seeder which already creates complete test data.

### Run the Seeder
```bash
# Run the seeder to create all test data
npm run db:seed
# or
npx sequelize-cli db:seed:all
```

### 📊 What the Seeder Creates:

#### **Test Accounts & Users:**
- **Parents:**
  - `ah250296@gmail.com` / `password` (Ahmed Ali - Parent ID: 1)
  - `parent2@example.com` / `password` (Fatima Hassan - Parent ID: 2)
  - `parent1@tride.com` / `password` (Mohamed Ibrahim - Parent ID: 3)
  - `parent2@tride.com` / `password` (Amira Mahmoud - Parent ID: 4)
  - And 4 more parents...

- **Driver:**
  - `driver@example.com` / `password` (Seham Ahmed - Driver ID: 1)

- **Admin:**
  - `admin@tride.com` / `admin123`

#### **Test Ride Groups:**
- **Group 1:** "Morning School Ride" (ID: 1)
  - Creator: Ahmed Ali (Parent ID: 1)
  - Driver: Seham Ahmed (Driver ID: 1)
  - School: The American International School in Egypt
  - Status: Active with 3 children

- **Group 2:** "Afternoon Activity Ride" (ID: 2)
  - Creator: Ahmed Ali (Parent ID: 1) 
  - Driver: Seham Ahmed (Driver ID: 1)
  - School: The American International School in Egypt
  - Status: Active with 2 children

- And 5 more ride groups with different statuses...

---

## 🔧 Method 2: Create Custom Test Data via API

If you want to create your own test data, follow these steps:

### 1. Create Test Accounts

#### Parent Account
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "testparent@example.com",
  "password": "password123",
  "account_type": "parent"
}
```

#### Driver Account  
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "testdriver@example.com", 
  "password": "password123",
  "account_type": "driver"
}
```

### 2. Verify Accounts
```bash
# You'll need to manually verify accounts in the database
UPDATE account SET is_verified = true WHERE email IN ('testparent@example.com', 'testdriver@example.com');
```

### 3. Create Parent Profile
```bash
POST /api/profile/parent
Authorization: Bearer {parent_jwt_token}
Content-Type: application/json

{
  "name": "Test Parent",
  "phone": "+201234567890",
  "city_id": 1,
  "gender": "male",
  "lat": 30.0444,
  "lng": 31.2357,
  "formatted_address": "Test Address, Cairo, Egypt"
}
```

### 4. Approve Parent Documents
```bash
# Manually approve in database
UPDATE parent SET documents_approved = true, documents_approval_date = NOW() WHERE account_id = {parent_account_id};
```

### 5. Create Driver Profile
```bash
POST /api/profile/driver
Authorization: Bearer {driver_jwt_token}
Content-Type: application/json

{
  "name": "Test Driver",
  "phone": "+201234567891", 
  "license_number": "TEST123456",
  "city_id": 1,
  "gender": "male",
  "lat": 30.0444,
  "lng": 31.2357,
  "formatted_address": "Driver Address, Cairo, Egypt"
}
```

### 6. Create Driver Papers
```bash
POST /api/profile/driver/papers
Authorization: Bearer {driver_jwt_token}
Content-Type: application/json

{
  "car_model": "Toyota Corolla",
  "car_model_year": 2020,
  "driver_license_exp_date": "2025-12-31",
  "car_license_exp_date": "2025-12-31"
}
```

### 7. Approve Driver Papers
```bash
# Manually approve in database
UPDATE driver_papers SET approved = true, approval_date = NOW() WHERE driver_id = {driver_id};
```

### 8. Create Children
```bash
POST /api/profile/child
Authorization: Bearer {parent_jwt_token}
Content-Type: application/json

{
  "name": "Test Child 1",
  "grade": "1st", 
  "gender": "male"
}
```

### 9. Create Ride Group
```bash
POST /api/ride/group/create
Authorization: Bearer {parent_jwt_token}
Content-Type: application/json

{
  "school_id": 1,
  "seats": 3,
  "home": {
    "home_lat": "30.0444",
    "home_lng": "31.2357"
  },
  "children": [
    {
      "child_id": 1,
      "timing_from": "08:00",
      "timing_to": "14:00"
    }
  ],
  "days": ["Sunday", "Monday", "Tuesday", "Wednesday"],
  "group_type": "regular"
}
```

### 10. Assign Driver to Group (Optional)
```bash
# Manually assign driver in database
UPDATE ride_group SET driver_id = {driver_id} WHERE id = {ride_group_id};
```

---

## 🧪 Testing the Chat Flow

### 1. Login as Parent
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "ah250296@gmail.com",
  "password": "password"
}
```

**Response:** Save the JWT token from the response.

### 2. Get or Create Chat Room
```bash
GET /api/chat/ride-group/1/room
Authorization: Bearer {parent_jwt_token}
```

**Response:** 
```json
{
  "success": true, 
  "message": "Chat Returned successfully",
  "data": {
    "_id": "room_mongo_id",
    "ride_group_id": 1,
    "name": "Chat Room for Morning School Ride", 
    "room_type": "ride_group",
    "participants": [
      {
        "user_id": 1,
        "user_type": "parent",
        "name": "Ahmed Ali"
      }
    ]
  }
}
```

**Save the `_id` (room ID) for next steps.**

### 3. Connect to Socket.IO
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'Bearer ' + jwt_token
  }
});

socket.on('connect', () => {
  console.log('Connected to chat server');
  
  // Join the chat room
  socket.emit('join_room', 'room_mongo_id');
});

// Listen for new messages
socket.on('new_chat_message', (data) => {
  console.log('New message:', data);
});
```

### 4. Get Message History
```bash
GET /api/chat/room/{room_id}/messages?page=1
Authorization: Bearer {parent_jwt_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Messages retrieved successfully",
  "data": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0
    },
    "messages": [],
    "room": {
      "_id": "room_id",
      "name": "Chat Room for Morning School Ride",
      "room_type": "ride_group"
    }
  }
}
```

### 5. Send a Test Message
```bash
POST /api/chat/messages/{room_id}/message
Authorization: Bearer {parent_jwt_token}
Content-Type: application/json

{
  "type": "text",
  "message": "Hello everyone! Looking forward to our carpool!"
}
```

### 6. Verify Real-time Message Reception
Check your Socket.IO connection - you should receive the message in real-time:
```json
{
  "_id": "message_id",
  "chat_room_id": "room_id", 
  "sender_id": 1,
  "sender_type": "parent",
  "type": "text",
  "message": "Hello everyone! Looking forward to our carpool!",
  "created_at": "2024-12-27T10:30:00.000Z"
}
```

### 7. Test as Driver
```bash
# 1. Login as driver
POST /api/auth/login
{
  "email": "driver@example.com",
  "password": "password"
}

# 2. Get the same chat room (driver will be auto-added)
GET /api/chat/ride-group/1/room
Authorization: Bearer {driver_jwt_token}

# 3. Send a message as driver
POST /api/chat/messages/{room_id}/message
Authorization: Bearer {driver_jwt_token}
{
  "type": "text", 
  "message": "Hi parents! I'm your driver. Ready to pick up the kids!"
}
```

### 8. Test Multiple Parents
Add more parents to the same ride group:
```bash
# Login as another parent
POST /api/auth/login
{
  "email": "parent2@example.com",
  "password": "password"
}

# Join group using invite code
POST /api/ride/group/add-parent/ABC12345
Authorization: Bearer {parent2_jwt_token}

# Access the same chat room
GET /api/chat/ride-group/1/room
Authorization: Bearer {parent2_jwt_token}
```

---

## 📱 Testing Different Room Types

### Ride Group Chat
```bash
GET /api/chat/ride-group/{rideGroupId}/room
GET /api/chat/room/{roomId}/messages
```

### Customer Support Chat
```bash
# Create customer support room
POST /api/chat/customer-support/room
Authorization: Bearer {user_jwt_token}

# Get messages
GET /api/chat/customer-support/room
Authorization: Bearer {user_jwt_token}
```

### Get All User's Chat Rooms
```bash
GET /api/chat/ride-group/rooms
Authorization: Bearer {user_jwt_token}
```

---

## 🎯 Complete Test Scenario

### Scenario: Multiple Parents in a Ride Group Chat

1. **Setup (Use Seeder):** Run `npm run db:seed`
2. **Parent 1 Login:** `ah250296@gmail.com` / `password`
3. **Parent 2 Login:** `parent2@example.com` / `password` 
4. **Driver Login:** `driver@example.com` / `password`
5. **Create Chat Room:** All users access `/api/chat/ride-group/1/room`
6. **Socket Connection:** All connect to Socket.IO
7. **Join Room:** All emit `join_room` with room ID
8. **Chat Flow:** 
   - Parent 1: "Good morning! What time pickup today?"
   - Driver: "Hi! Pickup at 7:30 AM as usual"
   - Parent 2: "Perfect! My daughter is ready"
   - Parent 1: "Thanks! See you soon"

### Test Different Message Types
```bash
# Text message
POST /api/chat/messages/{roomId}/message
{
  "type": "text",
  "message": "Hello everyone!"
}

# Reply to message
POST /api/chat/messages/{roomId}/message  
{
  "type": "text",
  "message": "Thanks for the update!",
  "reply_to": "original_message_id"
}

# Media message (after uploading file)
POST /api/chat/messages/{roomId}/media
{
  "type": "image", 
  "media_url": "uploaded_file_url"
}
```

---

## 🛠 Quick Database Queries for Testing

### Check Existing Data
```sql
-- Check accounts
SELECT id, email, account_type, is_verified FROM account;

-- Check parents 
SELECT p.id, p.name, a.email FROM parent p JOIN account a ON p.account_id = a.id;

-- Check ride groups
SELECT id, group_name, parent_creator_id, driver_id, current_seats_taken FROM ride_group;

-- Check chat rooms
SELECT _id, ride_group_id, name, room_type FROM chatrooms;

-- Check messages
SELECT _id, chat_room_id, sender_id, sender_type, message, created_at FROM chatmessages ORDER BY created_at DESC LIMIT 10;
```

### Manual Chat Room Creation (if needed)
```javascript
// In MongoDB shell or via API
db.chatrooms.insertOne({
  ride_group_id: 1,
  name: "Test Chat Room",
  room_type: "ride_group", 
  participants: [
    {
      user_id: 1,
      user_type: "parent",
      name: "Ahmed Ali"
    }
  ],
  created_at: new Date(),
  updated_at: new Date(),
  is_active: true
});
```

---

## 🎉 Success Checklist

✅ **User Authentication:** Parents and drivers can login
✅ **Chat Room Creation:** Room created automatically on first access  
✅ **User Authorization:** Only group members can access chat
✅ **Socket Connection:** Real-time connection established
✅ **Room Joining:** Users can join rooms via Socket.IO
✅ **Message Sending:** Users can send text messages
✅ **Message Receiving:** Users receive messages in real-time
✅ **Message History:** Past messages are loaded with pagination
✅ **Multiple Users:** Multiple parents and driver in same chat
✅ **Different Room Types:** Ride group, customer support working

---

## 🚨 Troubleshooting

### Common Issues:

1. **404 on chat endpoints:** Make sure routes have `/chat` prefix
2. **Unauthorized errors:** Check JWT token and user verification
3. **Socket connection fails:** Verify token format and user permissions
4. **No messages received:** Ensure `join_room` was emitted successfully
5. **Chat room not found:** Check if ride group exists and user is member

### Debug Commands:
```bash
# Check server logs
tail -f logs/app.log

# Check database connections
npm run db:migrate:status

# Test Socket.IO connection
node test_chat.html  # Open in browser
```

This setup gives you a complete testing environment for the chat system! 🎯
