# Live Tracking REST API - Postman Documentation

## Overview

This documentation provides complete Postman request/response examples for implementing live ride tracking functionality. The REST API mirrors Socket.IO behavior through HTTP endpoints, making it perfect for testing with Postman or building REST-based clients.

## Base Configuration

**Base URL**: `http://localhost:3000/api`

**Global Variables** (Set these in Postman):
- `base_url`: `http://localhost:3000/api`
- `token_driver`: (Auto-set from login response)
- `token_parent_1`: (Auto-set from login response)
- `token_admin`: (Auto-set from login response)
- `ride_group_id`: (Auto-set from create ride response)
- `ride_instance_id`: (Auto-set from create ride response)

## Authentication Flow

### 1. Driver Login

**Request:**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
    "email": "driver@example.com",
    "password": "password",
    "account_type": "driver"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NDUsImFjY291bnRfdHlwZSI6ImRyaXZlciIsImlhdCI6MTcwMzQyNzYwMCwiZXhwIjoxNzAzNTE0MDAwfQ.abc123",
        "account": {
            "id": 45,
            "email": "driver@example.com",
            "account_type": "driver",
            "driver": {
                "id": 12,
                "name": "John Doe",
                "status": "approved",
                "phone": "+1234567890",
                "license_number": "DL123456"
            }
        }
    }
}
```

**Postman Test Script:**
```javascript
const jsonResponse = pm.response.json();
if (jsonResponse && jsonResponse.data && jsonResponse.data.token) {
    pm.globals.set('token_driver', jsonResponse.data.token);
}
```

### 2. Parent Login

**Request:**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
    "email": "parent1@example.com",
    "password": "password",
    "account_type": "parent"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NjcsImFjY291bnRfdHlwZSI6InBhcmVudCIsImlhdCI6MTcwMzQyNzYwMCwiZXhwIjoxNzAzNTE0MDAwfQ.def456",
        "account": {
            "id": 67,
            "email": "parent1@example.com",
            "account_type": "parent",
            "parent": {
                "id": 23,
                "name": "Jane Smith",
                "phone": "+0987654321",
                "children": [
                    {
                        "id": 1,
                        "name": "Alice Smith",
                        "age": 8
                    },
                    {
                        "id": 2,
                        "name": "Bob Smith",
                        "age": 10
                    }
                ]
            }
        }
    }
}
```

**Postman Test Script:**
```javascript
const jsonResponse = pm.response.json();
if (jsonResponse && jsonResponse.data && jsonResponse.data.token) {
    pm.globals.set('token_parent_1', jsonResponse.data.token);
}
```

### 3. Admin Login

**Request:**
```http
POST {{base_url}}/auth/login
Content-Type: application/json

{
    "email": "admin@tride.com",
    "password": "admin123",
    "account_type": "admin"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiYWNjb3VudF90eXBlIjoiYWRtaW4iLCJpYXQiOjE3MDM0Mjc2MDAsImV4cCI6MTcwMzUxNDAwMH0.ghi789",
        "account": {
            "id": 1,
            "email": "admin@tride.com",
            "account_type": "admin",
            "admin": {
                "id": 1,
                "name": "System Admin",
                "permissions": ["view_all_rides", "manage_drivers", "system_admin"]
            }
        }
    }
}
```

**Postman Test Script:**
```javascript
const jsonResponse = pm.response.json();
if (jsonResponse && jsonResponse.data && jsonResponse.data.token) {
    pm.globals.set('token_admin', jsonResponse.data.token);
}
```

## Complete Driver Flow

### Step 1: Create Ride Instance

**Request:**
```http
POST {{base_url}}/ride/create
Authorization: Bearer {{token_driver}}
Content-Type: application/json

{
    "ride_group_id": 1,
    "type": "to_school"
}
```

**Response (Success):**
```json
{
    "success": true,
    "message": "Created a new ride instance",
    "data": {
        "rideInstance": {
            "id": 123,
            "type": "to_school",
            "driver_id": 45,
            "group_id": 1,
            "status": "created",
            "created_at": "2024-01-15T08:00:00.000Z",
            "updated_at": "2024-01-15T08:00:00.000Z"
        }
    }
}
```

**Response (Duplicate Instance):**
```json
{
    "success": true,
    "message": "A ride instance is already active for this group",
    "data": {
        "rideInstance": {
            "id": 122,
            "type": "to_school",
            "driver_id": 45,
            "group_id": 1,
            "status": "started"
        },
        "message": "Cannot create multiple ride instances. Please complete or cancel the existing ride first."
    }
}
```

**Postman Test Script:**
```javascript
const jsonResponse = pm.response.json();
if (jsonResponse && jsonResponse.data && jsonResponse.data.rideInstance) {
    pm.globals.set('ride_instance_id', jsonResponse.data.rideInstance.id);
    pm.globals.set('ride_group_id', jsonResponse.data.rideInstance.group_id);
}
```

### Step 2: Join Ride (Start Live Tracking)

**Request:**
```http
POST {{base_url}}/ride/join
Authorization: Bearer {{token_driver}}
Content-Type: application/json

{
    "ride_group_id": 1,
    "location": {
        "lat": 30.0444,
        "lng": 31.2357
    }
}
```

**Response (First Time Join):**
```json
{
    "success": true,
    "message": "Driver successfully joined ride",
    "data": {
        "uid": "driver:45:1:123",
        "order": {
            "0": {
                "lat": 30.0444,
                "lng": 31.2357,
                "type": "driver",
                "status": "done"
            },
            "1": {
                "lat": 30.9763,
                "lng": 30.0051,
                "type": "child",
                "id": 12,
                "children": [1, 2],
                "status": "pending"
            },
            "2": {
                "lat": 31.1234,
                "lng": 30.9876,
                "type": "child",
                "id": 15,
                "children": [3],
                "status": "pending"
            },
            "3": {
                "lat": 31.2001,
                "lng": 29.9187,
                "type": "school",
                "id": 5,
                "children": [1, 2, 3, 4],
                "status": "pending"
            }
        },
        "direction": "to_school",
        "reconnected": false
    }
}
```

**Response (Reconnection):**
```json
{
    "success": true,
    "message": "Driver reconnected to existing ride",
    "data": {
        "uid": "driver:45:1:123",
        "order": {
            "0": {
                "lat": 30.0444,
                "lng": 31.2357,
                "type": "driver",
                "status": "done"
            },
            "1": {
                "lat": 30.9763,
                "lng": 30.0051,
                "type": "child",
                "id": 12,
                "children": [1, 2],
                "status": "done",
                "confirmed_children": [1, 2]
            },
            "2": {
                "lat": 31.1234,
                "lng": 30.9876,
                "type": "child",
                "id": 15,
                "children": [3],
                "status": "pending"
            },
            "3": {
                "lat": 31.2001,
                "lng": 29.9187,
                "type": "school",
                "id": 5,
                "children": [1, 2, 3, 4],
                "status": "pending"
            }
        },
        "direction": "to_school",
        "reconnected": true
    }
}
```

**Postman Test Script:**
```javascript
const jsonResponse = pm.response.json();
if (jsonResponse && jsonResponse.data && jsonResponse.data.uid) {
    pm.globals.set('ride_uid', jsonResponse.data.uid);
    pm.globals.set('checkpoint_order', JSON.stringify(jsonResponse.data.order));
}
```

### Step 3: Update Location (Normal Movement)

**Request:**
```http
POST {{base_url}}/ride/location
Authorization: Bearer {{token_driver}}
Content-Type: application/json

{
    "location": {
        "lat": 30.0450,
        "lng": 31.2360
    }
}
```

**Response (Normal Location Update):**
```json
{
    "success": true,
    "message": "Location updated successfully",
    "data": {
        "location": {
            "lat": 30.0450,
            "lng": 31.2360,
            "ts": 1699123456789
        },
        "checkpointReached": null
    }
}
```

### Step 4: Update Location (Near Checkpoint)

**Request:**
```http
POST {{base_url}}/ride/location
Authorization: Bearer {{token_driver}}
Content-Type: application/json

{
    "location": {
        "lat": 30.9763,
        "lng": 30.0051
    }
}
```

**Response (Checkpoint Reached):**
```json
{
    "success": true,
    "message": "Location updated successfully",
    "data": {
        "location": {
            "lat": 30.9763,
            "lng": 30.0051,
            "ts": 1699123500000
        },
        "checkpointReached": {
            "lat": 30.9763,
            "lng": 30.0051,
            "type": "child",
            "id": 12,
            "children": [1, 2],
            "status": "pending",
            "index": 1,
            "distance": 25.3
        }
    }
}
```

### Step 5: Confirm Checkpoint

**Request:**
```http
POST {{base_url}}/ride/checkpoint/confirm
Authorization: Bearer {{token_driver}}
Content-Type: application/json

{
    "ride_group_id": 1,
    "checkpoint_index": 1,
    "location": {
        "lat": 30.9763,
        "lng": 30.0051
    },
    "children_ids": [1, 2]
}
```

**Response (Checkpoint Confirmed):**
```json
{
    "success": true,
    "message": "CHECKPOINT_CONFIRMED",
    "data": {
        "confirmed_children": [1, 2],
        "checkpointIndex": 1,
        "checkpoint": {
            "lat": 30.9763,
            "lng": 30.0051,
            "type": "child",
            "id": 12,
            "children": [1, 2],
            "status": "done",
            "confirmed_children": [1, 2]
        },
        "isRideComplete": false
    }
}
```

### Step 6: Complete Final Checkpoint

**Request:**
```http
POST {{base_url}}/ride/checkpoint/confirm
Authorization: Bearer {{token_driver}}
Content-Type: application/json

{
    "ride_group_id": 1,
    "checkpoint_index": 3,
    "location": {
        "lat": 31.2001,
        "lng": 29.9187
    },
    "children_ids": [1, 2, 3]
}
```

**Response (Ride Completed):**
```json
{
    "success": true,
    "message": "RIDE_COMPLETED",
    "data": {
        "confirmed_children": [1, 2, 3],
        "checkpointIndex": 3,
        "checkpoint": {
            "lat": 31.2001,
            "lng": 29.9187,
            "type": "school",
            "id": 5,
            "children": [1, 2, 3, 4],
            "status": "done",
            "confirmed_children": [1, 2, 3]
        },
        "isRideComplete": true
    }
}
```

### Step 7: Manual Complete Ride

**Request:**
```http
POST {{base_url}}/ride/complete
Authorization: Bearer {{token_driver}}
```

**Response:**
```json
{
    "success": true,
    "message": "Ride ended successfully",
    "data": {}
}
```

### Step 8: Cancel Ride

**Request:**
```http
POST {{base_url}}/ride/cancel
Authorization: Bearer {{token_driver}}
```

**Response:**
```json
{
    "success": true,
    "message": "Ride cancelled successfully",
    "data": {}
}
```

## Complete Parent Flow

### Step 1: Watch Ride

**Request:**
```http
POST {{base_url}}/ride/parent/watch
Authorization: Bearer {{token_parent_1}}
Content-Type: application/json

{
    "ride_group_id": 1
}
```

**Response (First Time Watch):**
```json
{
    "success": true,
    "message": "Parent successfully joined ride",
    "data": {
        "uid": "driver:45:1:123",
        "driverLocation": {
            "lat": 30.0450,
            "lng": 31.2360,
            "ts": 1699123456789
        },
        "checkpointOrder": {
            "0": {
                "lat": 30.0444,
                "lng": 31.2357,
                "type": "driver",
                "status": "done"
            },
            "1": {
                "lat": 30.9763,
                "lng": 30.0051,
                "type": "child",
                "id": 12,
                "children": [1, 2],
                "status": "pending"
            },
            "2": {
                "lat": 31.1234,
                "lng": 30.9876,
                "type": "child",
                "id": 15,
                "children": [3],
                "status": "pending"
            },
            "3": {
                "lat": 31.2001,
                "lng": 29.9187,
                "type": "school",
                "id": 5,
                "children": [1, 2, 3, 4],
                "status": "pending"
            }
        },
        "reconnected": false
    }
}
```

**Response (Reconnection):**
```json
{
    "success": true,
    "message": "Parent reconnected to existing ride",
    "data": {
        "uid": "driver:45:1:123",
        "driverLocation": {
            "lat": 30.9763,
            "lng": 30.0051,
            "ts": 1699123500000
        },
        "checkpointOrder": {
            "0": {
                "lat": 30.0444,
                "lng": 31.2357,
                "type": "driver",
                "status": "done"
            },
            "1": {
                "lat": 30.9763,
                "lng": 30.0051,
                "type": "child",
                "id": 12,
                "children": [1, 2],
                "status": "done",
                "confirmed_children": [1, 2]
            },
            "2": {
                "lat": 31.1234,
                "lng": 30.9876,
                "type": "child",
                "id": 15,
                "children": [3],
                "status": "pending"
            },
            "3": {
                "lat": 31.2001,
                "lng": 29.9187,
                "type": "school",
                "id": 5,
                "children": [1, 2, 3, 4],
                "status": "pending"
            }
        },
        "reconnected": true
    }
}
```

**Postman Test Script:**
```javascript
const jsonResponse = pm.response.json();
if (jsonResponse && jsonResponse.data && jsonResponse.data.uid) {
    pm.globals.set('parent_ride_uid', jsonResponse.data.uid);
}
```

### Step 2: Get Location Updates (Real-time Polling)

This endpoint mirrors socket `location_update` events. Call every 2-3 seconds for real-time updates.

**Request:**
```http
GET {{base_url}}/ride/parent/1/location-updates
Authorization: Bearer {{token_parent_1}}
```

**Response Type 1 - Normal Location Update:**
```json
{
    "success": true,
    "message": "Location update retrieved successfully",
    "data": {
        "type": "LOCATION_UPDATE",
        "message": "Driver location updated",
        "data": {
            "locationMap": {
                "lat": 30.0455,
                "lng": 31.2365,
                "ts": 1699123460000
            },
            "checkpointReached": null,
            "checkpointOrder": {
                "0": {
                    "lat": 30.0444,
                    "lng": 31.2357,
                    "type": "driver",
                    "status": "done"
                },
                "1": {
                    "lat": 30.9763,
                    "lng": 30.0051,
                    "type": "child",
                    "id": 12,
                    "children": [1, 2],
                    "status": "pending"
                },
                "2": {
                    "lat": 31.1234,
                    "lng": 30.9876,
                    "type": "child",
                    "id": 15,
                    "children": [3],
                    "status": "pending"
                },
                "3": {
                    "lat": 31.2001,
                    "lng": 29.9187,
                    "type": "school",
                    "id": 5,
                    "children": [1, 2, 3, 4],
                    "status": "pending"
                }
            }
        }
    },
    "meta": {
        "rideInstance": {
            "id": 123,
            "status": "active",
            "type": "to_school",
            "started_at": "2024-01-15T08:00:00.000Z"
        },
        "progress": {
            "completed": 1,
            "total": 4,
            "percentage": 25
        },
        "activeCheckpoint": {
            "index": 1,
            "type": "child",
            "lat": 30.9763,
            "lng": 30.0051,
            "id": 12,
            "children": [1, 2]
        },
        "lastUpdated": 1699123460000,
        "isTracking": true
    }
}
```

**Response Type 2 - Checkpoint Reached:**
```json
{
    "success": true,
    "message": "Location update retrieved successfully",
    "data": {
        "type": "CHECKPOINT_REACHED",
        "message": "Driver is near a checkpoint",
        "data": {
            "locationMap": {
                "lat": 30.9763,
                "lng": 30.0051,
                "ts": 1699123500000
            },
            "checkpointReached": {
                "lat": 30.9763,
                "lng": 30.0051,
                "type": "child",
                "id": 12,
                "children": [1, 2],
                "status": "pending",
                "index": 1,
                "distance": 25.3
            },
            "checkpointOrder": {
                "0": { "type": "driver", "status": "done" },
                "1": { "type": "child", "status": "pending" },
                "2": { "type": "child", "status": "pending" },
                "3": { "type": "school", "status": "pending" }
            }
        }
    },
    "meta": {
        "rideInstance": {
            "id": 123,
            "status": "active",
            "type": "to_school"
        },
        "progress": {
            "completed": 1,
            "total": 4,
            "percentage": 25
        },
        "activeCheckpoint": {
            "index": 1,
            "type": "child",
            "lat": 30.9763,
            "lng": 30.0051
        },
        "lastUpdated": 1699123500000,
        "isTracking": true
    }
}
```

**Response Type 3 - Checkpoint Confirmed:**
```json
{
    "success": true,
    "message": "Location update retrieved successfully",
    "data": {
        "type": "CHECKPOINT_CONFIRMED",
        "message": "Checkpoint has been confirmed",
        "data": {
            "locationMap": {
                "lat": 30.9763,
                "lng": 30.0051,
                "ts": 1699123520000
            },
            "checkpointReached": null,
            "checkpointOrder": {
                "0": { "type": "driver", "status": "done" },
                "1": { 
                    "type": "child", 
                    "status": "done",
                    "confirmed_children": [1, 2]
                },
                "2": { "type": "child", "status": "pending" },
                "3": { "type": "school", "status": "pending" }
            }
        }
    },
    "meta": {
        "rideInstance": {
            "id": 123,
            "status": "active",
            "type": "to_school"
        },
        "progress": {
            "completed": 2,
            "total": 4,
            "percentage": 50
        },
        "activeCheckpoint": {
            "index": 2,
            "type": "child",
            "lat": 31.1234,
            "lng": 30.9876
        },
        "lastUpdated": 1699123520000,
        "isTracking": true
    }
}
```

**Response Type 4 - Ride Completed:**
```json
{
    "success": true,
    "message": "Location update retrieved successfully",
    "data": {
        "type": "RIDE_COMPLETED",
        "message": "Ride has been completed",
        "data": {
            "locationMap": {
                "lat": 31.2001,
                "lng": 29.9187,
                "ts": 1699123600000
            },
            "checkpointReached": null,
            "checkpointOrder": {
                "0": { "type": "driver", "status": "done" },
                "1": { "type": "child", "status": "done" },
                "2": { "type": "child", "status": "done" },
                "3": { "type": "school", "status": "done" }
            }
        }
    },
    "meta": {
        "rideInstance": {
            "id": 123,
            "status": "ended",
            "type": "to_school",
            "started_at": "2024-01-15T08:00:00.000Z",
            "ended_at": "2024-01-15T09:00:00.000Z"
        },
        "progress": {
            "completed": 4,
            "total": 4,
            "percentage": 100
        },
        "activeCheckpoint": null,
        "lastUpdated": 1699123600000,
        "isTracking": false
    }
}
```

**Response Type 5 - Ride Cancelled:**
```json
{
    "success": true,
    "message": "Final ride status retrieved",
    "data": {
        "type": "RIDE_CANCELLED",
        "message": "Ride has been cancelled",
        "data": {
            "locationMap": {},
            "checkpointReached": null,
            "checkpointOrder": {}
        }
    },
    "meta": {
        "rideInstance": {
            "id": 123,
            "status": "cancelled",
            "type": "to_school",
            "started_at": "2024-01-15T08:00:00.000Z",
            "ended_at": "2024-01-15T08:30:00.000Z"
        },
        "progress": {
            "completed": 0,
            "total": 0,
            "percentage": 100
        },
        "activeCheckpoint": null,
        "lastUpdated": 1699123400000,
        "isTracking": false
    }
}
```

**Postman Test Script for Continuous Polling:**
```javascript
const jsonResponse = pm.response.json();

// Log the current update (same format as socket event)
console.log('Update Type:', jsonResponse.data?.type);
console.log('Message:', jsonResponse.data?.message);
console.log('Driver Location:', jsonResponse.data?.data?.locationMap);
console.log('Checkpoint Reached:', jsonResponse.data?.data?.checkpointReached);
console.log('Progress:', jsonResponse.data?.meta?.progress);

// Store current poll count
let pollCount = pm.globals.get('location_poll_count') || 0;
pollCount++;
pm.globals.set('location_poll_count', pollCount);

// Continue polling up to 5 times with 2 second delays
if (pollCount < 5) {
    setTimeout(() => {}, 2000); // 2 second delay
}
```

## Complete Admin Flow

### Step 1: Watch Specific Ride

**Request:**
```http
POST {{base_url}}/ride/admin/watch
Authorization: Bearer {{token_admin}}
Content-Type: application/json

{
    "ride_group_id": 1
}
```

**Response:**
```json
{
    "success": true,
    "message": "Admin successfully joined ride",
    "data": {
        "uid": "driver:45:1:123",
        "driverLocation": {
            "lat": 30.0450,
            "lng": 31.2360,
            "ts": 1699123456789
        },
        "checkpointOrder": {
            "0": { "type": "driver", "status": "done" },
            "1": { "type": "child", "status": "pending" },
            "2": { "type": "child", "status": "pending" },
            "3": { "type": "school", "status": "pending" }
        },
        "previousLocations": [
            {
                "id": 1,
                "ride_instance_id": 123,
                "lat": 30.0444,
                "lng": 31.2357,
                "created_at": "2024-01-15T08:00:00.000Z"
            },
            {
                "id": 2,
                "ride_instance_id": 123,
                "lat": 30.0448,
                "lng": 31.2359,
                "created_at": "2024-01-15T08:01:00.000Z"
            },
            {
                "id": 3,
                "ride_instance_id": 123,
                "lat": 30.0450,
                "lng": 31.2360,
                "created_at": "2024-01-15T08:02:00.000Z"
            }
        ],
        "reconnected": false
    }
}
```

### Step 2: Watch All Active Rides

**Request:**
```http
GET {{base_url}}/ride/admin/watch-all
Authorization: Bearer {{token_admin}}
```

**Response:**
```json
{
    "success": true,
    "message": "Active rides fetched successfully",
    "data": [
        {
            "rideInstance": {
                "id": 123,
                "type": "to_school",
                "driver_id": 45,
                "group_id": 1,
                "status": "active",
                "started_at": "2024-01-15T08:00:00.000Z"
            },
            "uid": "driver:45:1:123",
            "driverLocation": {
                "lat": 30.0450,
                "lng": 31.2360,
                "ts": 1699123456789
            },
            "checkpointOrder": {
                "0": { "type": "driver", "status": "done" },
                "1": { "type": "child", "status": "pending" }
            }
        },
        {
            "rideInstance": {
                "id": 124,
                "type": "to_home",
                "driver_id": 46,
                "group_id": 2,
                "status": "active",
                "started_at": "2024-01-15T15:00:00.000Z"
            },
            "uid": "driver:46:2:124",
            "driverLocation": {
                "lat": 31.2001,
                "lng": 29.9187,
                "ts": 1699123456789
            },
            "checkpointOrder": {
                "0": { "type": "school", "status": "done" },
                "1": { "type": "child", "status": "pending" }
            }
        }
    ]
}
```

## Error Response Examples

### 1. Driver Not Joined Error

**Request:**
```http
POST {{base_url}}/ride/location
Authorization: Bearer {{token_driver}}
Content-Type: application/json

{
    "location": {
        "lat": 30.0450,
        "lng": 31.2360
    }
}
```

**Response:**
```json
{
    "success": false,
    "message": "DRIVER MUST JOIN A RIDE FIRST BEFORE RELAYING LOCATIONS!",
    "error": "BadRequestError",
    "statusCode": 400
}
```

### 2. No Active Ride Instance Error

**Request:**
```http
POST {{base_url}}/ride/join
Authorization: Bearer {{token_driver}}
Content-Type: application/json

{
    "ride_group_id": 999,
    "location": {
        "lat": 30.0444,
        "lng": 31.2357
    }
}
```

**Response:**
```json
{
    "success": false,
    "message": "NO ACTIVE INSTANCES, CREATE ONE FIRST!",
    "error": "NotFoundError",
    "statusCode": 404
}
```

### 3. Too Far From Checkpoint Error

**Request:**
```http
POST {{base_url}}/ride/checkpoint/confirm
Authorization: Bearer {{token_driver}}
Content-Type: application/json

{
    "ride_group_id": 1,
    "checkpoint_index": 1,
    "location": {
        "lat": 25.0000,
        "lng": 25.0000
    },
    "children_ids": [1]
}
```

**Response:**
```json
{
    "success": false,
    "message": "ERROR: YOU ARE TOO FAR FROM CHECKPOINT! Distance: 982m (Required: within 50m)",
    "error": "BadRequestError",
    "statusCode": 400
}
```

### 4. Invalid Ride State Error

**Request:**
```http
POST {{base_url}}/ride/location
Authorization: Bearer {{token_driver}}
Content-Type: application/json

{
    "location": {
        "lat": 30.0450,
        "lng": 31.2360
    }
}
```

**Response:**
```json
{
    "success": false,
    "message": "INVALID RIDE STATE! Please join the ride again.",
    "error": "BadRequestError",
    "statusCode": 400
}
```

### 5. Parent Access Denied Error

**Request:**
```http
POST {{base_url}}/ride/parent/watch
Authorization: Bearer {{token_parent_1}}
Content-Type: application/json

{
    "ride_group_id": 999
}
```

**Response:**
```json
{
    "success": false,
    "message": "NO ACTIVE INSTANCES, WAIT FOR DRIVER TO START!",
    "error": "NotFoundError",
    "statusCode": 404
}
```

### 6. Multiple Active Rides Error

**Request:**
```http
POST {{base_url}}/ride/create
Authorization: Bearer {{token_driver}}
Content-Type: application/json

{
    "ride_group_id": 2,
    "type": "to_school"
}
```

**Response:**
```json
{
    "success": false,
    "message": "You have 1 active ride(s) in other groups. Please complete them before starting a new ride.",
    "error": "BadRequestError",
    "statusCode": 400
}
```

### 7. Checkpoint Already Confirmed Error

**Request:**
```http
POST {{base_url}}/ride/checkpoint/confirm
Authorization: Bearer {{token_driver}}
Content-Type: application/json

{
    "ride_group_id": 1,
    "checkpoint_index": 1,
    "location": {
        "lat": 30.9763,
        "lng": 30.0051
    },
    "children_ids": [1, 2]
}
```

**Response:**
```json
{
    "success": false,
    "message": "ERROR: CHECKPOINT ALREADY CONFIRMED!",
    "error": "BadRequestError",
    "statusCode": 400
}
```

## Debug and Utility Endpoints

### Force Leave Room (Driver)

**Request:**
```http
POST {{base_url}}/ride/leave-room
Authorization: Bearer {{token_driver}}
```

**Response:**
```json
{
    "success": true,
    "message": "Successfully forced leave from all rooms",
    "data": {
        "driverId": 12,
        "socketsFound": 2,
        "roomsLeft": 1,
        "totalConnections": 2
    }
}
```

### Cancel Ride Instance (Alternative to Cancel Ride)

**Request:**
```http
DELETE {{base_url}}/ride/123/cancel
Authorization: Bearer {{token_driver}}
```

**Response:**
```json
{
    "success": true,
    "message": "Ride instance cancelled successfully",
    "data": {
        "rideInstanceId": 123,
        "status": "ended"
    }
}
```

## Postman Collection Usage

### Environment Setup

Create a Postman environment with these variables:
```json
{
    "base_url": "http://localhost:3000/api",
    "token_driver": "",
    "token_parent_1": "", 
    "token_admin": "",
    "ride_group_id": "",
    "ride_instance_id": "",
    "ride_uid": "",
    "parent_ride_uid": "",
    "checkpoint_order": "",
    "location_poll_count": "0"
}
```

### Recommended Testing Flows

#### 1. Complete Driver Flow
1. Login Driver → Create Ride Instance → Join Ride → Update Location (multiple times) → Confirm Checkpoints → Complete Ride

#### 2. Complete Parent Flow  
1. Login Parent → (Wait for driver to join) → Watch Ride → Poll Location Updates (continuous) → Watch completion

#### 3. Admin Monitoring Flow
1. Login Admin → Watch All Rides → Watch Specific Ride → Monitor multiple rides

#### 4. Error Testing Flow
1. Try operations without authentication
2. Try operations in wrong order
3. Try invalid data
4. Test reconnection scenarios

### Real-time Polling Simulation

For parent location updates, set up a Postman collection runner:

**Pre-request Script:**
```javascript
// Add 2-3 second delay between requests
setTimeout(() => {}, 2000);
```

**Test Script:**
```javascript
const jsonResponse = pm.response.json();

// Log real-time updates
console.log(`[${new Date().toISOString()}] ${jsonResponse.data?.type}: ${jsonResponse.data?.message}`);

// Check if ride is complete
if (jsonResponse.data?.type === "RIDE_COMPLETED" || jsonResponse.data?.type === "RIDE_CANCELLED") {
    pm.execution.setNextRequest(null); // Stop polling
}
```

Run this request 10-20 times to simulate real-time polling during an active ride.

### Socket vs REST Data Comparison

The REST API returns data in the exact same format as Socket.IO events:

**Socket Event:**
```javascript
socket.on('location_update', (data) => {
    console.log(data.type);     // "LOCATION_UPDATE", "CHECKPOINT_REACHED", etc.
    console.log(data.message);  // Human readable message
    console.log(data.data);     // Location and checkpoint data
});
```

**REST Response:**
```json
{
    "data": {
        "type": "LOCATION_UPDATE",
        "message": "Driver location updated", 
        "data": {
            "locationMap": {...},
            "checkpointReached": null,
            "checkpointOrder": {...}
        }
    },
    "meta": {...}
}
```

This makes it easy to switch between Socket.IO and REST implementations or use them in parallel.
