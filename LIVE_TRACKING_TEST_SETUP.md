# 🚗 Live Tracking Test Setup Guide

This guide provides a complete test environment for the live tracking functionality with pre-configured accounts, ride groups, and coordinates.

## 🎯 Quick Setup (3 Commands)

```bash
# 1. Run the live tracking seeder
npx sequelize-cli db:seed --seed 20250123000000-live-tracking-test-data.js

# 2. Complete the setup (create ride instance + chat room)
node src/scripts/setup-live-tracking-test.js

# 3. Start the server
npm run dev
```

## 📋 Test Accounts & Data

### 🔑 **Login Credentials**
| Role | Email | Password | Name | ID |
|------|-------|----------|------|-----|
| 🚗 Driver | ah@d1.com | password | ahmed driver | 101 |
| 👨‍👧‍👦 Parent 1 | ah@p1.com | password | ahmedP1 | 101 |
| 👨‍👧‍👦 Parent 2 | ah@p2.com | password | ahmedP2 | 102 |

### 👶 **Children**
| Name | Age | Gender | Grade | Parent |
|------|-----|--------|-------|--------|
| fayroiz | 6 | female | grade 1 | ahmedP1 |
| jane | 6 | female | grade 1 | ahmedP2 |

### 🚐 **Ride Group Details**
- **Name**: test-school
- **ID**: 1001
- **Type**: premium
- **Seats**: 5 total, 2 taken
- **Schedule**: Sunday-Thursday, 08:00am-04:00pm
- **Driver**: ahmed driver (APPROVED papers)
- **School**: test school (ID: 200)

## 📍 **Test Route Coordinates (Cairo)**

### 🗺️ **Checkpoint Order**
```
Driver Start → Parent 1 → Parent 2 → School
```

### 📍 **Exact Coordinates**
| Point | Latitude | Longitude | Description |
|-------|----------|-----------|-------------|
| 🚗 **Driver Start** | 29.987073938979787 | 31.334552232417717 | Starting point |
| 🏠 **Parent 1 (ahmedP1)** | 29.983118437109667 | 31.321797582017027 | sada ST cairo |
| 🏠 **Parent 2 (ahmedP2)** | 29.9817868849066 | 31.3263882582345 | horia ST cairo |
| 🏫 **School End** | 29.984450411139598 | 31.32561581359936 | test school |

## 🧪 **Live Tracking Test Flow**

### **Step 1: Login & Get Tokens**
```bash
# Login as driver
curl -X POST "http://localhost:4000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "ah@d1.com", "password": "password"}'

# Login as parent 1
curl -X POST "http://localhost:4000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "ah@p1.com", "password": "password"}'

# Login as parent 2  
curl -X POST "http://localhost:4000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "ah@p2.com", "password": "password"}'
```

### **Step 2: Driver Socket Connection**
```javascript
const driverSocket = io("ws://localhost:4000", {
  auth: {
    token: "Bearer <driver_jwt_token>"
  },
  extraHeaders: {
    "Authorization": "Bearer <driver_jwt_token>"
  }
});

// Join ride
driverSocket.emit("driver_join_ride", JSON.stringify({
  "ride_group_id": 1001,
  "location": {
    "lat": 29.987073938979787,
    "lng": 31.334552232417717
  }
}));
```

### **Step 3: Parents Socket Connection**
```javascript
const parent1Socket = io("ws://localhost:4000", {
  auth: { token: "Bearer <parent1_jwt_token>" }
});

const parent2Socket = io("ws://localhost:4000", {
  auth: { token: "Bearer <parent2_jwt_token>" }
});

// Both parents watch the ride
parent1Socket.emit("parent_watch_ride", JSON.stringify({
  "ride_group_id": 1001
}));

parent2Socket.emit("parent_watch_ride", JSON.stringify({
  "ride_group_id": 1001
}));
```

### **Step 4: Driver Location Updates**
```javascript
// Move towards Parent 1
driverSocket.emit("driver_location_update", JSON.stringify({
  "location": {
    "lat": 29.985,
    "lng": 31.325
  }
}));

// Arrive at Parent 1 - Confirm checkpoint
driverSocket.emit("driver_confirm_checkpoint", JSON.stringify({
  "ride_group_id": 1001,
  "checkpoint_index": 1,
  "location": {
    "lat": 29.983118437109667,
    "lng": 31.321797582017027
  },
  "children_ids": [1001] // fayroiz
}));
```

### **Step 5: Complete Route**
```javascript
// Move to Parent 2
driverSocket.emit("driver_location_update", JSON.stringify({
  "location": {
    "lat": 29.982,
    "lng": 31.328
  }
}));

// Confirm Parent 2 pickup
driverSocket.emit("driver_confirm_checkpoint", JSON.stringify({
  "ride_group_id": 1001,
  "checkpoint_index": 2,
  "location": {
    "lat": 29.9817868849066,
    "lng": 31.3263882582345
  },
  "children_ids": [1002] // jane
}));

// Arrive at school - Complete ride
driverSocket.emit("driver_confirm_checkpoint", JSON.stringify({
  "ride_group_id": 1001,
  "checkpoint_index": 3,
  "location": {
    "lat": 29.984450411139598,
    "lng": 31.32561581359936
  },
  "children_ids": [1001, 1002] // both children
}));
```

## 🌐 **Useful API Endpoints**

### **For Driver:**
```bash
# Get assigned ride groups
GET /api/driver/my-ride-groups
Authorization: Bearer <driver_token>

# Create new ride instance (if needed)
POST /api/ride/create
{
  "type": "to_school",
  "ride_group_id": 1001
}
```

### **For Parents:**
```bash
# Get ride group chat rooms
GET /api/chat/ride-group/rooms
Authorization: Bearer <parent_token>

# Access chat room
GET /api/chat/ride-group/1001/room
Authorization: Bearer <parent_token>
```

### **Chat Room Messages:**
```bash
# Get chat room messages (once created)
GET /api/chat/room/<chat_room_id>/messages?page=1
Authorization: Bearer <token>
```

## 📱 **Testing with HTML File**

Use the test file at `public/test-ride-socket.html`:

```
http://localhost:4000/test-ride-socket.html
```

1. Open in browser
2. Connect with test tokens
3. Use the visual interface for testing

## 🧪 **Expected Socket Events**

### **Driver Receives:**
- `ack`: `DRIVER_JOIN_SUCCESS` with checkpoint order
- `ack`: `LOCATION_UPDATE_SUCCESS` for each update
- `ack`: `CHECKPOINT_CONFIRMED` for each checkpoint

### **Parents Receive:**
- `ack`: `PARENT_JOIN_SUCCESS` with initial driver location
- `location_update`: `LOCATION_UPDATE` for each driver movement
- `location_update`: `CHECKPOINT_REACHED` when near checkpoints
- `location_update`: `CHECKPOINT_CONFIRMED` when checkpoints confirmed
- `location_update`: `RIDE_COMPLETED` when ride finished

## 🚨 **Troubleshooting**

### **Common Issues:**

**1. "NO ACTIVE INSTANCES" error**
- The setup script creates a ride instance
- If deleted, create via: `POST /api/ride/create`

**2. "Not authorized to access chat room"**
- Access the room first: `GET /api/chat/ride-group/1001/room`
- This creates the chat room and adds participants

**3. "Invalid location coordinates"**
- Use exact coordinates from this guide
- Ensure lat/lng are numbers, not strings

**4. Driver papers not approved**
- The seeder automatically approves papers
- Check `driver_papers.approved = true`

### **Verification Queries:**
```sql
-- Check accounts
SELECT id, email, account_type, is_verified FROM account WHERE id IN (1001, 1002, 1003);

-- Check ride group
SELECT * FROM ride_group WHERE id = 1001;

-- Check parent memberships
SELECT pg.*, p.name FROM parent_group pg 
JOIN parent p ON pg.parent_id = p.id 
WHERE pg.group_id = 1001;

-- Check driver papers
SELECT driver_id, approved, approval_date FROM driver_papers WHERE driver_id = 101;
```

## 🎉 **Success Indicators**

✅ **Setup Complete When:**
- All accounts login successfully
- Driver joins ride without errors
- Parents join ride and receive driver location
- Location updates broadcast to parents
- Checkpoints confirm in correct order
- Chat rooms accessible by all participants

## 🗑️ **Cleanup**

To remove test data:
```bash
npm run db:seed:undo:specific -- --seed 20250123000000-live-tracking-test-data.js
```

This removes all test accounts, ride groups, and related data while preserving existing system data.

---

## 📞 **Support**

If you encounter issues:
1. Check the console logs for specific error messages
2. Verify all accounts are created and verified
3. Ensure Redis is running for ride tracking
4. Check Socket.IO connection status
5. Verify coordinates are within valid ranges

**Happy Testing! 🚀**
