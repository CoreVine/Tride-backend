# Socket.IO Testing Guide for TRIDE Platform

This comprehensive guide shows how to test all socket features using Postman or any WebSocket client. All examples include exact inputs, expected outputs, and step-by-step instructions.

## 📋 Table of Contents

1. [Prerequisites & Setup](#prerequisites--setup)
2. [Socket Connection](#socket-connection)
3. [Chat Room Management](#chat-room-management)
4. [Chat Messaging](#chat-messaging)
5. [Ride Management (Driver)](#ride-management-driver)
6. [Ride Tracking (Parent)](#ride-tracking-parent)
7. [Socket Events Reference](#socket-events-reference)
8. [Testing Scenarios](#testing-scenarios)
9. [Troubleshooting](#troubleshooting)

---

## 🔐 Prerequisites & Setup

### Required Data Setup
Before testing sockets, ensure you have:

1. **Valid JWT Token**: Login first to get authentication token
2. **Verified Account**: Email must be verified (`is_verified: true`)
3. **Approved Documents**: 
   - Parents: `documents_approved: true`
   - Drivers: Driver papers approved
4. **Ride Group**: Active ride group with parent and driver
5. **Device Token**: Registered during login (for notifications)

### Test Environment Setup
```
Base URL: http://localhost:3000 (or your server URL)
Socket URL: ws://localhost:3000
```

---

## 🔌 Socket Connection

### Step 1: Connect to Socket.IO

**Connection URL**:
```
ws://localhost:3000
```

**Authentication Headers**:
```json
{
  "auth": {
    "token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "extraHeaders": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Expected Response Events**:
```javascript
// On successful connection
connect: "socket_id_here"

// On authentication failure
connect_error: "Authentication failed: No token provided"
```

**Connection Verification**:
- You should receive a `connect` event with your socket ID
- Socket automatically joins room `user_{userId}`
- User connection stored in Redis for notifications

---

## 🏠 Chat Room Management

### A. Ride Group Chat Rooms

#### Get/Create Ride Group Chat Room

**HTTP Endpoint First** (Required):
```
GET /api/chat/ride-group/{rideGroupId}/room
Authorization: Bearer {token}
```

**Example Request**:
```
GET /api/chat/ride-group/1/room
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "_id": "676e1234567890abcdef1234",
    "ride_group_id": "1",
    "name": "Chat Room for Morning School Ride",
    "room_type": "ride_group",
    "participants": [
      {
        "user_id": "2",
        "user_type": "parent",
        "name": "Ahmed Ali"
      }
    ],
    "last_message": null
  }
}
```

#### Join Chat Room via Socket

**Socket Event**: `join_room`
**Data**: `"676e1234567890abcdef1234"` (chat room ID from above response)

**Example**:
```javascript
socket.emit("join_room", "676e1234567890abcdef1234");
```

**Expected Response**:
```javascript
// Success
ack: "OK"

// Failure
ack: "Unauthorized!"
```

**Authorization Rules**:
- **Parents/Drivers**: Must be member of the ride group
- **Admins**: Need `VIEW_CHAT_HISTORY` permission

### B. Customer Support Chat Rooms

#### Create Customer Support Room (Parent/Driver Only)

**HTTP Endpoint**:
```
POST /api/chat/customer-support/room
Authorization: Bearer {token}
Content-Type: application/json
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "_id": "676e5678901234567890abcd",
    "name": "Customer Support - Ahmed Ali",
    "room_type": "customer_support",
    "participants": [
      {
        "user_id": "2",
        "user_type": "parent",
        "name": "Ahmed Ali"
      }
    ]
  }
}
```

#### Join Customer Support Room

**Socket Event**: `join_room`
**Data**: `"676e5678901234567890abcd"` (customer support room ID)

**Authorization Rules**:
- **Room Creator**: Can always join
- **Admins**: Need `CHAT_WITH_PARENT` or `CHAT_WITH_DRIVER` permission

---

## 💬 Chat Messaging

### A. Load Chat History

**HTTP Endpoint**:
```
GET /api/chat/ride-group/{rideGroupId}/messages?page=1
Authorization: Bearer {token}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25
    },
    "messages": [
      {
        "_id": "676e1234567890abcdef5678",
        "sender_id": "2",
        "sender_type": "parent",
        "sender_name": "Ahmed Ali",
        "type": "text",
        "message": "Good morning everyone!",
        "created_at": "2024-12-27T08:30:00.000Z",
        "is_deleted": false,
        "reply_to": null
      }
    ]
  }
}
```

### B. Send Text Message

**HTTP Endpoint**:
```
POST /api/chat/messages/{chatRoomId}/message
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "type": "text",
  "message": "Hello everyone! Ready for the ride?",
  "reply_to": null
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "_id": "676e9876543210fedcba0987",
    "sender_id": "2",
    "sender_type": "parent",
    "sender_name": "Ahmed Ali",
    "type": "text",
    "message": "Hello everyone! Ready for the ride?",
    "created_at": "2024-12-27T10:30:00.000Z",
    "chat_room_id": "676e1234567890abcdef1234"
  }
}
```

**Real-time Effects**:
1. All users in the chat room receive `new_message` socket event
2. Push notifications sent to all group members
3. Chat room's `last_message` updated

**Socket Event Received by Others**:
```javascript
new_message: {
  "_id": "676e9876543210fedcba0987",
  "sender_id": "2",
  "sender_type": "parent",
  "sender_name": "Ahmed Ali",
  "type": "text",
  "message": "Hello everyone! Ready for the ride?",
  "created_at": "2024-12-27T10:30:00.000Z",
  "chat_room_id": "676e1234567890abcdef1234"
}
```

### C. Reply to Message

**Request Body**:
```json
{
  "type": "text",
  "message": "Yes, we're ready!",
  "reply_to": "676e9876543210fedcba0987"
}
```

### D. Delete Message

**HTTP Endpoint**:
```
DELETE /api/chat/messages/{messageId}
Authorization: Bearer {token}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

**Socket Event Received by Others**:
```javascript
message_deleted: {
  "message_id": "676e9876543210fedcba0987",
  "chat_room_id": "676e1234567890abcdef1234"
}
```

---

## 🚗 Ride Management (Driver)

### A. Create Ride Instance (HTTP First)

**HTTP Endpoint**:
```
POST /api/ride/create
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body**:
```json
{
  "type": "to_school",
  "ride_group_id": 1
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "type": "to_school",
    "status": "created",
    "group_id": 1,
    "driver_id": 5,
    "created_at": "2024-12-27T08:00:00.000Z"
  }
}
```

### B. Join Ride as Driver

**Socket Event**: `driver_join_ride`

**Data Payload**:
```json
{
  "ride_group_id": 1,
  "location": {
    "lat": 24.7136,
    "lng": 46.6753
  }
}
```

**Example**:
```javascript
socket.emit("driver_join_ride", JSON.stringify({
  "ride_group_id": 1,
  "location": {
    "lat": 24.7136,
    "lng": 46.6753
  }
}));
```

**Expected Success Response**:
```javascript
ack: {
  "type": "DRIVER_JOIN_SUCCESS",
  "message": "Driver successfully joined ride",
  "data": {
    "uid": "driver:5:1:123",
    "order": {
      "0": {
        "lat": 24.7136,
        "lng": 46.6753,
        "type": "driver",
        "id": 5,
        "status": "done"
      },
      "1": {
        "lat": 24.7200,
        "lng": 46.6800,
        "type": "child",
        "id": 2,
        "children": [10, 11],
        "status": "pending"
      },
      "2": {
        "lat": 24.7300,
        "lng": 46.6900,
        "type": "school",
        "id": "school_id",
        "children": [10, 11],
        "status": "pending"
      }
    },
    "direction": "to_school"
  }
}
```

**Error Responses**:
```javascript
// Already joined
ack: {
  "type": "DRIVER_JOIN_ERROR",
  "message": "ALREADY JOINED RIDE",
  "data": null
}

// No active instance
ack: {
  "type": "DRIVER_JOIN_ERROR",
  "message": "NO ACTIVE INSTANCES, CREATE ONE FIRST!",
  "data": null
}

// Invalid location
ack: {
  "type": "DRIVER_JOIN_ERROR", 
  "message": "Invalid location is set!",
  "data": null
}
```

### C. Send Location Updates

**Socket Event**: `driver_location_update`

**Data Payload**:
```json
{
  "location": {
    "lat": 24.7150,
    "lng": 46.6770
  }
}
```

**Example**:
```javascript
socket.emit("driver_location_update", JSON.stringify({
  "location": {
    "lat": 24.7150,
    "lng": 46.6770
  }
}));
```

**Expected Response**:
```javascript
ack: {
  "type": "LOCATION_UPDATE_SUCCESS",
  "message": "Location updated successfully",
  "data": null
}
```

**Parents Receive (if near checkpoint)**:
```javascript
location_update: {
  "type": "CHECKPOINT_REACHED",
  "message": "Driver is near a checkpoint",
  "data": {
    "locationMap": {
      "lat": 24.7150,
      "lng": 46.6770,
      "ts": 1703673000000
    },
    "checkpointReached": {
      "lat": 24.7200,
      "lng": 46.6800,
      "type": "child",
      "id": 2,
      "children": [10, 11],
      "index": 1,
      "distance": 45
    }
  }
}
```

**Parents Receive (normal location update)**:
```javascript
location_update: {
  "type": "LOCATION_UPDATE",
  "message": "Driver location updated", 
  "data": {
    "locationMap": {
      "lat": 24.7150,
      "lng": 46.6770,
      "ts": 1703673000000
    },
    "checkpointReached": null
  }
}
```

### D. Confirm Checkpoint

**Socket Event**: `driver_confirm_checkpoint`

**Data Payload**:
```json
{
  "ride_group_id": 1,
  "checkpoint_index": 1,
  "location": {
    "lat": 24.7200,
    "lng": 46.6800
  },
  "children_ids": [10, 11]
}
```

**Example**:
```javascript
socket.emit("driver_confirm_checkpoint", JSON.stringify({
  "ride_group_id": 1,
  "checkpoint_index": 1,
  "location": {
    "lat": 24.7200,
    "lng": 46.6800
  },
  "children_ids": [10, 11]
}));
```

**Expected Success Response**:
```javascript
ack: {
  "type": "CHECKPOINT_CONFIRMED",
  "message": "CHECKPOINT_CONFIRMED",
  "data": {
    "confirmed_children": [10, 11]
  }
}
```

**Parents Receive**:
```javascript
location_update: {
  "type": "CHECKPOINT_CONFIRMED",
  "message": "Checkpoint has been confirmed",
  "data": {
    "checkpointIndex": 1,
    "checkpoint": {
      "lat": 24.7200,
      "lng": 46.6800,
      "type": "child",
      "id": 2,
      "children": [10, 11],
      "status": "done",
      "confirmed_children": [10, 11]
    },
    "status": "Continued trip: picked up children with IDs: 10, 11 from home",
    "isRideComplete": false,
    "confirmed_children": [10, 11]
  }
}
```

**Error Responses**:
```javascript
// Too far from checkpoint
ack: {
  "type": "CHECKPOINT_CONFIRM_ERROR",
  "message": "ERROR: YOU ARE TOO FAR FROM CHECKPOINT! Distance: 150m",
  "data": null
}

// Invalid children
ack: {
  "type": "CHECKPOINT_CONFIRM_ERROR",
  "message": "ERROR: Children with IDs [12] do not belong to this house!",
  "data": null
}

// Already confirmed
ack: {
  "type": "CHECKPOINT_CONFIRM_ERROR",
  "message": "ERROR: CHECKPOINT ALREADY CONFIRMED!",
  "data": null
}
```

### E. Complete Ride (Final Checkpoint)

**Data Payload** (school checkpoint):
```json
{
  "ride_group_id": 1,
  "checkpoint_index": 2,
  "location": {
    "lat": 24.7300,
    "lng": 46.6900
  },
  "children_ids": [10, 11]
}
```

**Expected Response**:
```javascript
ack: {
  "type": "RIDE_COMPLETED",
  "message": "RIDE_COMPLETED",
  "data": {
    "confirmed_children": [10, 11]
  }
}
```

**Parents Receive**:
```javascript
location_update: {
  "type": "RIDE_COMPLETED",
  "message": "Ride has been completed successfully",
  "data": {
    "checkpointIndex": 2,
    "checkpoint": {
      "lat": 24.7300,
      "lng": 46.6900,
      "type": "school",
      "id": "school_id",
      "children": [10, 11],
      "status": "done",
      "confirmed_children": [10, 11]
    },
    "status": "Finished trip. End destination: school",
    "isRideComplete": true,
    "confirmed_children": [10, 11]
  }
}
```

**Automatic Actions After Ride Completion**:
- All sockets disconnected from ride room after 10 seconds
- Ride instance marked as finished in database
- Redis data cleaned up

---

## 👨‍👩‍👧‍👦 Ride Tracking (Parent)

### A. Join Ride as Parent

**Socket Event**: `parent_watch_ride`

**Data Payload**:
```json
{
  "ride_group_id": 1
}
```

**Example**:
```javascript
socket.emit("parent_watch_ride", JSON.stringify({
  "ride_group_id": 1
}));
```

**Expected Success Response**:
```javascript
ack: {
  "type": "PARENT_JOIN_SUCCESS",
  "message": "Parent successfully joined ride",
  "data": {
    "uid": "driver:5:1:123",
    "driverLocation": {
      "lat": 24.7150,
      "lng": 46.6770,
      "ts": 1703673000000
    },
    "checkpointOrder": {
      "0": {
        "lat": 24.7136,
        "lng": 46.6753,
        "type": "driver",
        "id": 5,
        "status": "done"
      },
      "1": {
        "lat": 24.7200,
        "lng": 46.6800,
        "type": "child",
        "id": 2,
        "children": [10, 11],
        "status": "pending"
      }
    }
  }
}
```

**Error Responses**:
```javascript
// No active ride
ack: {
  "type": "PARENT_JOIN_ERROR",
  "message": "NO ACTIVE INSTANCES, WAIT FOR DRIVER TO START!",
  "data": null
}

// Already joined
ack: {
  "type": "PARENT_JOIN_ERROR",
  "message": "ALREADY JOINED RIDE",
  "data": null
}
```

### B. Receive Location Updates

Parents automatically receive location updates once joined:

**Regular Location Update**:
```javascript
location_update: {
  "type": "LOCATION_UPDATE",
  "message": "Driver location updated",
  "data": {
    "locationMap": {
      "lat": 24.7160,
      "lng": 46.6780,
      "ts": 1703673060000
    },
    "checkpointReached": null
  }
}
```

**Checkpoint Reached**:
```javascript
location_update: {
  "type": "CHECKPOINT_REACHED", 
  "message": "Driver is near a checkpoint",
  "data": {
    "locationMap": {
      "lat": 24.7195,
      "lng": 46.6795,
      "ts": 1703673120000
    },
    "checkpointReached": {
      "lat": 24.7200,
      "lng": 46.6800,
      "type": "child",
      "id": 2,
      "children": [10, 11],
      "index": 1,
      "distance": 35
    }
  }
}
```

### C. Receive Checkpoint Confirmations

```javascript
location_update: {
  "type": "CHECKPOINT_CONFIRMED",
  "message": "Checkpoint has been confirmed",
  "data": {
    "checkpointIndex": 1,
    "checkpoint": {
      "lat": 24.7200,
      "lng": 46.6800,
      "type": "child",
      "id": 2,
      "children": [10, 11],
      "status": "done",
      "confirmed_children": [10, 11]
    },
    "status": "Continued trip: picked up children with IDs: 10, 11 from home",
    "isRideComplete": false,
    "confirmed_children": [10, 11]
  }
}
```

### D. Receive Ride Completion

```javascript
location_update: {
  "type": "RIDE_COMPLETED",
  "message": "Ride has been completed successfully",
  "data": {
    "checkpointIndex": 2,
    "checkpoint": {
      "lat": 24.7300,
      "lng": 46.6900,
      "type": "school",
      "status": "done"
    },
    "status": "Finished trip. End destination: school",
    "isRideComplete": true
  }
}
```

---

## 📡 Socket Events Reference

### Events You Can Emit

| Event | Data Type | Purpose | Required Role |
|-------|-----------|---------|---------------|
| `join_room` | String (chatRoomId) | Join chat room | Parent/Driver/Admin |
| `leave_room` | String (chatRoomId) | Leave chat room | Any |
| `driver_join_ride` | JSON String | Start/join ride as driver | Driver only |
| `parent_watch_ride` | JSON String | Watch ride as parent | Parent only |
| `driver_location_update` | JSON String | Send location updates | Driver only |
| `driver_confirm_checkpoint` | JSON String | Confirm checkpoint arrival | Driver only |

### Events You Can Listen To

| Event | Data Type | Description |
|-------|-----------|-------------|
| `connect` | String | Socket connected successfully |
| `connect_error` | String | Connection failed |
| `disconnect` | - | Socket disconnected |
| `ack` | Object/String | Response to emitted events |
| `new_message` | Object | New chat message received |
| `message_deleted` | Object | Chat message was deleted |
| `location_update` | Object | Driver location/status update |
| `new_notification` | Object | Push notification received |

### Location Update Event Types

| Type | Description | Data Contains |
|------|-------------|---------------|
| `DRIVER_STATUS` | Driver joined/left ride | `checkpointOrder` |
| `LOCATION_UPDATE` | Regular location update | `locationMap`, `checkpointReached: null` |
| `CHECKPOINT_REACHED` | Driver near checkpoint | `locationMap`, `checkpointReached` object |
| `CHECKPOINT_CONFIRMED` | Checkpoint confirmed | `checkpointIndex`, `checkpoint`, `status` |
| `RIDE_COMPLETED` | Ride finished | `checkpoint`, `status`, `isRideComplete: true` |

---

## 🧪 Testing Scenarios

### Scenario 1: Complete Chat Flow

1. **Connect to Socket**
   ```javascript
   // Connect with auth header
   ```

2. **Get Chat Room** (HTTP)
   ```
   GET /api/chat/ride-group/1/room
   ```

3. **Join Chat Room** (Socket)
   ```javascript
   socket.emit("join_room", "676e1234567890abcdef1234");
   ```

4. **Send Message** (HTTP)
   ```
   POST /api/chat/messages/676e1234567890abcdef1234/message
   Body: {"type": "text", "message": "Hello!"}
   ```

5. **Receive Real-time Message** (Socket)
   ```javascript
   socket.on("new_message", (data) => {
     console.log("New message:", data);
   });
   ```

### Scenario 2: Complete Ride Flow (Driver)

1. **Create Ride Instance** (HTTP)
   ```
   POST /api/ride/create
   Body: {"type": "to_school", "ride_group_id": 1}
   ```

2. **Join Ride** (Socket)
   ```javascript
   socket.emit("driver_join_ride", JSON.stringify({
     "ride_group_id": 1,
     "location": {"lat": 24.7136, "lng": 46.6753}
   }));
   ```

3. **Send Location Updates** (Socket)
   ```javascript
   socket.emit("driver_location_update", JSON.stringify({
     "location": {"lat": 24.7150, "lng": 46.6770}
   }));
   ```

4. **Confirm Checkpoint** (Socket)
   ```javascript
   socket.emit("driver_confirm_checkpoint", JSON.stringify({
     "ride_group_id": 1,
     "checkpoint_index": 1,
     "location": {"lat": 24.7200, "lng": 46.6800},
     "children_ids": [10, 11]
   }));
   ```

### Scenario 3: Complete Ride Flow (Parent)

1. **Join Ride** (Socket)
   ```javascript
   socket.emit("parent_watch_ride", JSON.stringify({
     "ride_group_id": 1
   }));
   ```

2. **Listen to Updates** (Socket)
   ```javascript
   socket.on("location_update", (data) => {
     console.log("Location update:", data);
   });
   ```

---

## 🔧 Admin Features

### A. Admin Chat Access

**Required Permissions**:
- `VIEW_CHAT_HISTORY`: View all ride group chats
- `CHAT_WITH_PARENT`: Access parent customer support
- `CHAT_WITH_DRIVER`: Access driver customer support

**View All Ride Group Chats** (HTTP):
```
GET /api/admin/admin-view/chats/ride-groups?page=1&limit=10
Authorization: Bearer {admin_token}
```

**View Customer Support Rooms** (HTTP):
```
GET /api/admin/admin-view/chats/customer-support/rooms?page=1&limit=10
Authorization: Bearer {admin_token}
```

**Join Any Chat Room** (Socket):
```javascript
// Admin can join any room they have permissions for
socket.emit("join_room", "any_chat_room_id");
```

### B. Admin Ride Monitoring

Currently, admin ride monitoring is not implemented but socket infrastructure supports it.

---

## 🚨 Troubleshooting

### Common Connection Issues

**Issue**: `connect_error: "Authentication failed"`
**Solution**: 
- Check JWT token format: `Bearer {token}`
- Ensure token is valid and not expired
- Verify account is verified and approved

**Issue**: `ack: "Unauthorized!"`
**Solution**:
- Check if user is member of ride group
- Verify admin has required permissions
- Ensure parent/driver documents are approved

### Common Ride Issues

**Issue**: `NO ACTIVE INSTANCES, CREATE ONE FIRST!`
**Solution**: Create ride instance using HTTP endpoint first

**Issue**: `YOU ARE TOO FAR FROM CHECKPOINT!`
**Solution**: 
- Check coordinates are correct
- Ensure you're within 100m of checkpoint
- Verify checkpoint index is correct

**Issue**: `Invalid location is set!`
**Solution**:
- Ensure lat/lng are valid numbers
- Check coordinates are within valid ranges (-90 to 90 for lat, -180 to 180 for lng)

### Debugging Tips

1. **Enable Socket Logging**:
   ```javascript
   socket.on("connect", () => console.log("Connected:", socket.id));
   socket.on("disconnect", () => console.log("Disconnected"));
   socket.on("ack", (data) => console.log("ACK:", data));
   ```

2. **Check Redis Connection**: Ensure Redis is running for ride data storage

3. **Verify Database Data**: Check ride groups, participants, and active instances

4. **Test HTTP Endpoints First**: Always test HTTP endpoints before socket functionality

---

## 📊 Testing Checklist

### Pre-Testing Setup
- [ ] User registered and email verified
- [ ] Documents approved (parent/driver)
- [ ] Valid JWT token obtained
- [ ] Ride group created with participants
- [ ] Redis server running
- [ ] Database contains test data

### Chat Testing
- [ ] Socket connection successful
- [ ] Join ride group chat room
- [ ] Send text messages
- [ ] Receive real-time messages
- [ ] Delete messages
- [ ] Leave chat room

### Ride Testing (Driver)
- [ ] Create ride instance (HTTP)
- [ ] Join ride via socket
- [ ] Send location updates
- [ ] Confirm each checkpoint
- [ ] Complete ride

### Ride Testing (Parent)
- [ ] Join ride via socket
- [ ] Receive driver location updates
- [ ] Receive checkpoint notifications
- [ ] Receive ride completion

### Admin Testing
- [ ] View all chat rooms
- [ ] Join chat rooms with permissions
- [ ] View customer support rooms
- [ ] Access chat messages

---

## 📝 Notes

1. **Always use HTTP endpoints first** for room creation and data setup
2. **Socket events require JSON strings** for complex payloads
3. **Location coordinates** must be valid GPS coordinates
4. **Checkpoint radius** is 100 meters by default
5. **Ride rooms auto-cleanup** after completion
6. **Redis is required** for ride tracking functionality
7. **Permissions are strictly enforced** for admin features

This guide provides all necessary information to test the complete socket functionality of the TRIDE platform. Each example includes exact inputs and expected outputs for comprehensive testing.
