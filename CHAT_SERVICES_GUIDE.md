# Chat Services Integration Guide for Flutter Developers

This guide provides essential information about chat service endpoints and socket connections. Developers are expected to implement the Flutter code based on these specifications.

## 🔐 Prerequisites & Authentication Flow

### Required for All Users
- ✅ Valid JWT token from authentication
- ✅ User's email verified (`is_verified: true`)
- ✅ Documents approved (parents/drivers)
- ✅ **Device token registered** (required for notifications)

### Authentication & Device Token Registration

**Step 1: Login with Device Token**
```
POST /api/auth/login
```

**Required Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "account_type": "parent|driver|admin",
  "device_token": "flutter_device_token_here"
}
```

**Important**: Device token is required for non-admin accounts and is automatically stored for push notifications.

**Step 2: Logout (Clean Device Token)**
```
POST /api/auth/logout
```

**Required Body**:
```json
{
  "device_token": "flutter_device_token_here"
}
```

**Testing Requirement**: Must login with device token before testing notifications.

---

## 📡 Step 1: Socket.IO Connection

### Connection URL
```
ws://your-server-url
```

### Authentication
```javascript
{
  'auth': {
    'token': 'Bearer your_jwt_token_here'
  },
  'extraHeaders': {
    'Authorization': 'Bearer your_jwt_token_here'
  }
}
```

### 🎧 Socket Events You Can Listen To

| Event | Data | Description |
|-------|------|-------------|
| `connect` | `socket.id` | Successfully connected to server |
| `connect_error` | `error` | Connection failed |
| `disconnect` | - | Disconnected from server |
| `ack` | `"OK"` or error message | Response to room join/leave |
| `new_message` | Message object | New message in joined room |
| `message_deleted` | `{message_id, chat_room_id}` | Message was deleted |
| `new_notification` | Notification object | Push notification received |
| `notifications_read` | `{notificationIds: []}` | Multiple notifications read |
| `notification_read` | `{notificationId, is_read}` | Single notification read |
| `all_notifications_read` | - | All notifications marked read |
| `notification_deleted` | `{notificationId}` | Notification deleted |

### 📤 Socket Events You Can Emit

| Event | Data | Description |
|-------|------|-------------|
| `join_room` | `chatRoomId` | Join chat room for real-time messages |
| `leave_room` | `chatRoomId` | Leave chat room |

---

## 🏠 Step 2: Get Chat Room for Ride Group

**Endpoint**: `GET /api/chat/ride-group/{rideGroupId}/room`

**Headers**: 
```
Authorization: Bearer your_jwt_token
Content-Type: application/json
```

**User Access**: Parents and drivers who are members of the ride group.

**Response**:
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
    "last_message": {
      "_id": "676e5678901234567890abcd",
      "message": "Hello everyone!",
      "created_at": "2024-12-27T10:30:00.000Z"
    }
  }
}
```

---

## 🚪 Step 3: Join Chat Room via Socket

**Socket Event**: `join_room`
**Data**: `chatRoomId` (string)

**Authorization**: 
- **Ride Group Chats**: User must be member of the ride group
- **Customer Support**: User who created the room or admin with proper permissions

**Important**: Must join room via socket before receiving real-time messages.

**Response**: Listen for `ack` event with `"OK"` or error message.

---

## 📜 Step 4: Fetch Message History

**Endpoint**: `GET /api/chat/ride-group/{rideGroupId}/messages?page=1`

**Headers**:
```
Authorization: Bearer your_jwt_token
Content-Type: application/json
```

**Response**:
```json
{
  "success": true,
  "data": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 47
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

---

## 💬 Step 5: Send Text Messages

**Endpoint**: `POST /api/chat/messages/{chatRoomId}/message`

**Headers**:
```
Authorization: Bearer your_jwt_token
Content-Type: application/json
```

**Request Body**:
```json
{
  "type": "text",
  "message": "Hello everyone!",
  "reply_to": "optional_message_id_to_reply_to"
}
```

**Real-time Effect**: 
- All users in room receive `new_message` socket event
- Push notifications sent to all group members
- Message stored in database

---

## 🗑️ Step 6: Delete Messages

**Endpoint**: `DELETE /api/chat/messages/{messageId}`

**Headers**:
```
Authorization: Bearer your_jwt_token
```

**Note**: Only sender can delete their own messages.

**Real-time Effect**: All users in room receive `message_deleted` socket event.

---

## 🔔 Step 7: Handle Notifications

### Get Paginated Notifications

**Endpoint**: `GET /api/chat/me/notifications`

**Headers**:
```
Authorization: Bearer your_jwt_token
Content-Type: application/json
```

**Request Body**:
```json
{
  "page": 1,
  "limit": 10,
  "readOnly": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25
    },
    "notifications": [
      {
        "_id": "notification_id",
        "title": "New Message",
        "message": "You have a new message",
        "type": "chat_message",
        "is_read": false,
        "created_at": "2024-12-27T10:30:00.000Z"
      }
    ]
  }
}
```

### Send Test Notification (Super Admin Only)

**Endpoint**: `POST /api/chat/test/notification`

**Headers**:
```
Authorization: Bearer your_jwt_token
Content-Type: application/json
```

**Required Role**: Super Admin only

**Request Body**:
```json
{
  "recipientId": "user_id",
  "senderId": "sender_id",
  "type": "chat_message",
  "title": "New Message",
  "message": "You have a new message",
  "related_entity_type": "chat_room",
  "related_entity_id": "chat_room_id",
  "metadata": {
    "chat_room_id": "chat_room_id",
    "sender_id": "sender_id"
  }
}
```

**Prerequisites**: 
- Must be logged in as super admin
- Recipient must have device token registered
- Test after completing full authentication flow

---

## 🏥 Step 8: Customer Support Chat

### Create Customer Support Room

**Endpoint**: `POST /api/chat/customer-support/room`

**Headers**:
```
Authorization: Bearer your_jwt_token
Content-Type: application/json
```

**User Access**: Parents and drivers only

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "customer_support_room_id",
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

### Get Customer Support Messages

**Endpoint**: `GET /api/chat/customer-support/room?page=1`

**Headers**:
```
Authorization: Bearer your_jwt_token
Content-Type: application/json
```

**User Access**: Room creator or admin with customer support permissions

---

## 🔧 Step 9: Admin Features

### View All Ride Group Chat Rooms (Admin)

**Endpoint**: `GET /api/admin/admin-view/chats/ride-groups?page=1&limit=10`

**Headers**:
```
Authorization: Bearer your_jwt_token
Content-Type: application/json
```

**Required Permission**: `VIEW_CHAT_HISTORY`

### View Ride Group Messages (Admin)

**Endpoint**: `GET /api/admin/admin-view/chats/ride-groups/{rideGroupId}/messages?page=1`

**Required Permission**: `VIEW_CHAT_HISTORY`

### View Customer Support Rooms (Admin)

**Endpoint**: `GET /api/admin/admin-view/chats/customer-support/rooms?page=1&limit=10`

**Required Permissions**: `CHAT_WITH_DRIVER` OR `CHAT_WITH_PARENT`

### View Customer Support Messages (Admin)

**Endpoint**: `GET /api/admin/admin-view/chats/customer-support/rooms/{chatRoomId}/messages?page=1`

**Required Permissions**: `CHAT_WITH_DRIVER` OR `CHAT_WITH_PARENT`

---

## 🔄 Step 10: Group Management (Super Admin)

### Merge Ride Groups

**What it does**: Combines two ride groups into one, allowing multiple parents in a single group.

**Endpoint**: `PUT /api/admin/manage/ride/group/merge`

**Headers**:
```
Authorization: Bearer your_jwt_token
Content-Type: application/json
```

**Required Role**: Super Admin only

**Request Body**:
```json
{
  "group_src": "source_group_id",
  "group_dest": "destination_group_id"
}
```

**Effect**: 
- All participants from source group moved to destination group
- Chat rooms are merged
- Enables multiple parents in single ride group
- Required step for creating multi-parent groups

### Get Ride Groups (Admin)

**Endpoint**: `GET /api/admin/manage/ride/groups`

**Required Permission**: Group management with "Payments" access

---

## 🚪 Step 11: Leave Chat Room

**Socket Event**: `leave_room`
**Data**: `chatRoomId` (string)

---

## 📋 Message Types & Admin Permissions

### Supported Message Types
- `text`: Text messages only

### Admin Role Permissions
| Permission | Description |
|------------|-------------|
| `VIEW_CHAT_HISTORY` | View all ride group chats |
| `CHAT_WITH_DRIVER` | Access driver customer support |
| `CHAT_WITH_PARENT` | Access parent customer support |
| Super Admin | Full access + group merging + test notifications |

---

## 🔄 Implementation Flow

1. **Login with Device Token** → Required for notifications
2. **Connect Socket** → Authenticate with JWT
3. **Get Chat Room** → HTTP request to get/create room
4. **Join Room** → Socket emit to receive real-time messages
5. **Load History** → HTTP request for past messages
6. **Send Messages** → HTTP request + automatic socket broadcast
7. **Handle Real-time** → Listen to socket events for updates
8. **Leave Room** → Socket emit when exiting chat

### Admin Flow
1. **Login as Admin** → No device token required
2. **Check Permissions** → Verify role and permissions
3. **Access Admin Endpoints** → View/manage chats
4. **Merge Groups** → (Super Admin only) Combine ride groups

---

## ⚠️ Important Notes

1. **Device Token Required**: Must register device token during login for notifications
2. **Authentication Required**: All endpoints need valid JWT token
3. **Socket Connection**: Required for real-time features
4. **Room Joining**: Must join via socket before receiving messages
5. **Admin Permissions**: Different endpoints require specific permissions
6. **Group Merging**: Required for multi-parent groups (Super Admin only)
7. **Real-time Updates**: All actions broadcast to connected users
8. **Error Handling**: Check response status codes
9. **Testing Order**: Login → Register device token → Test notifications

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check JWT token validity and user verification |
| 403 Forbidden | Verify document approval and admin permissions |
| Socket connection fails | Check token format in auth header |
| Messages not received | Ensure room is joined via socket |
| Notifications not working | Ensure device token was registered during login |
| Admin endpoints blocked | Check role and specific permissions |
| Group merge fails | Ensure Super Admin role |

---

## 📚 Testing Requirements

### Pre-Testing Setup
1. **Complete Authentication Flow**:
   - Register account → Verify email → Login with device token
   - For admin: Login as admin (no device token needed)

2. **Document Approval**:
   - Parents: Ensure `documents_approved: true`
   - Drivers: Ensure driver papers approved

3. **Group Membership**:
   - Ensure user is member of ride group for chat access
   - For group merging: Have multiple groups ready

### Testing Order
1. Login endpoints (with device token)
2. Socket connection
3. Chat room creation/access
4. Message sending/receiving
5. Notification testing (requires device token)
6. Admin features (with proper permissions)
7. Group merging (Super Admin only)

### Use Postman Collections
Use the provided Postman collections in the backend root directory to test all endpoints before implementing in Flutter. Collections include proper authentication flow and permission testing.
