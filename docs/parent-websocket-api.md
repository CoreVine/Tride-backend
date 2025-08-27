# Parent WebSocket API Documentation

## Overview
This document describes how parents can connect to the Tride WebSocket API to track their children's ride progress in real-time using their ride group ID.

## Table of Contents
- [WebSocket Connection Setup](#websocket-connection-setup)
- [Authentication](#authentication)
- [Joining a Ride](#joining-a-ride)
- [Response Types](#response-types)
- [Real-Time Events](#real-time-events)
- [Error Handling](#error-handling)
- [Complete Implementation Example](#complete-implementation-example)
- [Data Structures](#data-structures)

## WebSocket Connection Setup

### Base URL
```
ws://82.25.101.221:3010
```

### Connection with Authentication
```javascript
const io = require('socket.io-client');

const socket = io('http://82.25.101.221:3010', {
  auth: {
    token: 'Bearer YOUR_PARENT_JWT_TOKEN'
  }
});
```

## Authentication

### Requirements
- **JWT Token**: Valid parent account authentication token
- **Account Type**: Must be `"parent"`
- **Permissions**: Parent must belong to the specified ride group
- **Active Ride**: A driver must have started a ride instance for the group

### Token Format
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Joining a Ride

### Event Name
```
parent_watch_ride
```

### Payload
```javascript
{
  ride_group_id: 1001  // Required: Your ride group ID (integer)
}
```

### Usage
```javascript
socket.emit('parent_watch_ride', {
  ride_group_id: 1001
});
```

## Response Types

### Success Response
**Event:** `ack`
```javascript
{
  type: "PARENT_JOIN_SUCCESS",
  message: "Parent successfully joined ride",
  data: {
    uid: "driver:101:1001:14",           // Unique ride room identifier
    driverLocation: {                     // Current driver GPS coordinates
      lat: 29.9829237,                   // Latitude (float)
      lng: 31.3216196,                   // Longitude (float)
      ts: 1756298428846                  // Timestamp (unix milliseconds)
    },
    checkpointOrder: {                    // Complete route with checkpoints
      "0": {
        type: "garage",                   // garage|child|school
        lat: 29.9829237,
        lng: 31.3216196,
        status: "done",                   // done|pending|active
        id: 101                           // Location/entity ID
      },
      "1": {
        type: "child",
        lat: 30.0123456,
        lng: 31.2345678,
        status: "pending",
        id: 501,
        children: [201, 202]              // Child IDs at this location
      },
      "2": {
        type: "school", 
        lat: 30.0555555,
        lng: 31.2777777,
        status: "pending",
        id: 301
      }
    }
  }
}
```

### Error Responses
**Event:** `ack`

#### Missing Ride Group ID
```javascript
{
  type: "PARENT_JOIN_ERROR",
  message: "BAD REQUEST, MISSING ride_group_id!",
  data: null
}
```

#### No Active Ride
```javascript
{
  type: "PARENT_JOIN_ERROR",
  message: "NO ACTIVE INSTANCES, WAIT FOR DRIVER TO START!",
  data: null
}
```

#### Already Joined
```javascript
{
  type: "PARENT_JOIN_ERROR",
  message: "ALREADY JOINED RIDE",
  data: null
}
```

#### Unauthorized Access
```javascript
{
  type: "PARENT_JOIN_ERROR",
  message: "Unauthorized!",
  data: null
}
```

## Real-Time Events

All real-time updates are sent via the `location_update` event.

### 1. Driver Location Updates

Sent periodically as the driver moves.

```javascript
{
  type: "LOCATION_UPDATE",
  message: "Driver location updated",
  data: {
    driverLocation: {
      lat: 29.9829237,                   // Current latitude
      lng: 31.3216196,                   // Current longitude  
      ts: 1756298428846                  // Timestamp
    },
    nextCheckpoint: {                     // Next destination
      type: "child",                      // checkpoint type
      lat: 30.0123456,
      lng: 31.2345678,
      id: 501,
      distance: 1250                      // Distance in meters
    },
    estimatedArrival: "5 minutes"         // ETA to next checkpoint
  }
}
```

### 2. Driver Near Checkpoint

Triggered when driver is within proximity of a checkpoint (typically ~100m).

```javascript
{
  type: "CHECKPOINT_REACHED",
  message: "Driver is near a checkpoint",
  data: {
    checkpoint: {
      type: "child",                      // garage|child|school
      lat: 30.0123456,
      lng: 31.2345678,
      id: 501,
      children: [201, 202]                // Child IDs (for child checkpoints)
    },
    distance: 85                          // Distance to checkpoint in meters
  }
}
```

### 3. Checkpoint Confirmed

Sent when driver confirms arrival/completion of a checkpoint.

```javascript
{
  type: "CHECKPOINT_CONFIRMED", 
  message: "Checkpoint has been confirmed",
  data: {
    checkpoint: {
      type: "child",
      id: 501
    },
    confirmed_children: [201, 202],       // Only present for child checkpoints
    updatedOrder: {
      // Complete updated checkpoint order with new statuses
      "0": { ... },
      "1": { status: "done", ... },
      "2": { ... }
    }
  }
}
```

### 4. Driver Status Changes

#### Driver Joined Ride
```javascript
{
  type: "DRIVER_STATUS",
  message: "Driver has joined!",
  data: {
    checkpointOrder: {
      // Complete route information
    }
  }
}
```

#### Driver Left Ride  
```javascript
{
  type: "DRIVER_STATUS",
  message: "Driver has left!",
  data: {}
}
```

### 5. Ride Completion

Sent when all checkpoints are completed and ride ends.

```javascript
{
  type: "RIDE_COMPLETED",
  message: "Ride has been completed successfully",
  data: {
    totalCheckpoints: 3,
    completedAt: 1756298500000            // Completion timestamp
  }
}
```

### 6. Ride Cancellation

Sent when driver cancels the ride before completion.

```javascript
{
  type: "RIDE_CANCELLED",
  message: "Driver has cancelled the ride",
  data: {}
}
```

## Error Handling

### Connection Errors
```javascript
socket.on('connect_error', (error) => {
  console.error('WebSocket connection failed:', error.message);
  // Handle reconnection logic
});
```

### Disconnection Handling
```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // Handle reconnection if needed
});
```

### Invalid Responses
Always check the response type before processing data:

```javascript
socket.on('ack', (response) => {
  if (response.type.endsWith('_ERROR')) {
    // Handle error
    console.error('Operation failed:', response.message);
  } else {
    // Handle success
    console.log('Success:', response.data);
  }
});
```

## Complete Implementation Example

### React/JavaScript Implementation

```javascript
import io from 'socket.io-client';

class ParentRideTracker {
  constructor(token, rideGroupId) {
    this.token = token;
    this.rideGroupId = rideGroupId;
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    this.socket = io('http://82.25.101.221:3010', {
      auth: {
        token: `Bearer ${this.token}`
      }
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket');
      this.isConnected = true;
      this.joinRide();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
    });

    // Join ride response
    this.socket.on('ack', (response) => {
      this.handleJoinResponse(response);
    });

    // Real-time updates
    this.socket.on('location_update', (update) => {
      this.handleLocationUpdate(update);
    });
  }

  joinRide() {
    if (!this.isConnected) {
      console.error('Not connected to WebSocket');
      return;
    }

    console.log(`🚌 Joining ride for group ${this.rideGroupId}`);
    this.socket.emit('parent_watch_ride', {
      ride_group_id: this.rideGroupId
    });
  }

  handleJoinResponse(response) {
    if (response.type === 'PARENT_JOIN_SUCCESS') {
      console.log('✅ Successfully joined ride!');
      console.log('📍 Driver location:', response.data.driverLocation);
      console.log('🗺️ Route checkpoints:', response.data.checkpointOrder);
      
      // Update UI with initial data
      this.onRideJoined(response.data);
    } else if (response.type === 'PARENT_JOIN_ERROR') {
      console.error('❌ Failed to join ride:', response.message);
      
      // Handle specific errors
      this.onJoinError(response.message);
    }
  }

  handleLocationUpdate(update) {
    console.log(`📡 Received update: ${update.type}`);

    switch (update.type) {
      case 'LOCATION_UPDATE':
        console.log('📍 Driver moved to:', update.data.driverLocation);
        console.log('🎯 Next stop:', update.data.nextCheckpoint);
        console.log('⏰ ETA:', update.data.estimatedArrival);
        this.onDriverLocationUpdate(update.data);
        break;

      case 'CHECKPOINT_REACHED':
        console.log('🏃 Driver approaching:', update.data.checkpoint);
        console.log('📏 Distance:', update.data.distance, 'meters');
        this.onCheckpointReached(update.data);
        break;

      case 'CHECKPOINT_CONFIRMED':
        console.log('✅ Checkpoint confirmed!');
        if (update.data.confirmed_children) {
          console.log('👶 Children involved:', update.data.confirmed_children);
        }
        this.onCheckpointConfirmed(update.data);
        break;

      case 'DRIVER_STATUS':
        console.log('👨‍✈️ Driver status:', update.message);
        this.onDriverStatusChange(update);
        break;

      case 'RIDE_COMPLETED':
        console.log('🎉 Ride completed successfully!');
        this.onRideCompleted(update.data);
        break;

      case 'RIDE_CANCELLED':
        console.log('❌ Ride was cancelled');
        this.onRideCancelled();
        break;

      default:
        console.log('ℹ️ Unknown update type:', update.type);
    }
  }

  // Callback methods to implement in your app
  onRideJoined(data) {
    // Update UI with initial ride data
  }

  onJoinError(message) {
    // Handle join errors (show error message, retry, etc.)
  }

  onDriverLocationUpdate(data) {
    // Update driver position on map
    // Update ETA displays
  }

  onCheckpointReached(data) {
    // Show notification that driver is nearby
  }

  onCheckpointConfirmed(data) {
    // Update UI to show checkpoint completion
    // Show children pickup/dropoff notifications
  }

  onDriverStatusChange(update) {
    // Handle driver joining/leaving
  }

  onRideCompleted(data) {
    // Show completion notification
    // Navigate to ride summary
  }

  onRideCancelled() {
    // Show cancellation notification
    // Handle cleanup
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
    }
  }
}

// Usage
const tracker = new ParentRideTracker('your-jwt-token', 1001);
tracker.connect();
```

### Flutter/Dart Implementation

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class ParentRideTracker {
  late IO.Socket socket;
  final String token;
  final int rideGroupId;
  bool isConnected = false;

  ParentRideTracker({required this.token, required this.rideGroupId});

  void connect() {
    socket = IO.io('http://82.25.101.221:3010', 
      IO.OptionBuilder()
        .setAuth({'token': 'Bearer $token'})
        .build()
    );

    setupEventListeners();
    socket.connect();
  }

  void setupEventListeners() {
    socket.on('connect', (_) {
      print('✅ Connected to WebSocket');
      isConnected = true;
      joinRide();
    });

    socket.on('disconnect', (data) {
      print('❌ Disconnected: $data');
      isConnected = false;
    });

    socket.on('connect_error', (error) {
      print('❌ Connection error: $error');
    });

    socket.on('ack', (response) {
      handleJoinResponse(response);
    });

    socket.on('location_update', (update) {
      handleLocationUpdate(update);
    });
  }

  void joinRide() {
    if (!isConnected) {
      print('Not connected to WebSocket');
      return;
    }

    print('🚌 Joining ride for group $rideGroupId');
    socket.emit('parent_watch_ride', {
      'ride_group_id': rideGroupId
    });
  }

  void handleJoinResponse(dynamic response) {
    if (response['type'] == 'PARENT_JOIN_SUCCESS') {
      print('✅ Successfully joined ride!');
      print('📍 Driver location: ${response['data']['driverLocation']}');
      print('🗺️ Route checkpoints: ${response['data']['checkpointOrder']}');
      
      onRideJoined(response['data']);
    } else if (response['type'] == 'PARENT_JOIN_ERROR') {
      print('❌ Failed to join ride: ${response['message']}');
      onJoinError(response['message']);
    }
  }

  void handleLocationUpdate(dynamic update) {
    print('📡 Received update: ${update['type']}');

    switch (update['type']) {
      case 'LOCATION_UPDATE':
        onDriverLocationUpdate(update['data']);
        break;
      case 'CHECKPOINT_REACHED':
        onCheckpointReached(update['data']);
        break;
      case 'CHECKPOINT_CONFIRMED':
        onCheckpointConfirmed(update['data']);
        break;
      case 'DRIVER_STATUS':
        onDriverStatusChange(update);
        break;
      case 'RIDE_COMPLETED':
        onRideCompleted(update['data']);
        break;
      case 'RIDE_CANCELLED':
        onRideCancelled();
        break;
    }
  }

  // Implement these methods in your app
  void onRideJoined(Map<String, dynamic> data) {}
  void onJoinError(String message) {}
  void onDriverLocationUpdate(Map<String, dynamic> data) {}
  void onCheckpointReached(Map<String, dynamic> data) {}
  void onCheckpointConfirmed(Map<String, dynamic> data) {}
  void onDriverStatusChange(Map<String, dynamic> update) {}
  void onRideCompleted(Map<String, dynamic> data) {}
  void onRideCancelled() {}

  void disconnect() {
    socket.disconnect();
    isConnected = false;
  }
}
```

## Data Structures

### Location Object
```typescript
interface Location {
  lat: number;      // Latitude (-90 to 90)
  lng: number;      // Longitude (-180 to 180) 
  ts: number;       // Unix timestamp in milliseconds
}
```

### Checkpoint Object
```typescript
interface Checkpoint {
  type: 'garage' | 'child' | 'school';
  lat: number;
  lng: number;
  status: 'pending' | 'active' | 'done';
  id: number;
  children?: number[];  // Only for 'child' type checkpoints
  distance?: number;    // Distance in meters (when relevant)
}
```

### Checkpoint Order
```typescript
interface CheckpointOrder {
  [index: string]: Checkpoint;  // Index as string key
}
```

## Best Practices

### 1. Connection Management
- Always handle connection errors gracefully
- Implement automatic reconnection logic
- Store authentication token securely
- Check connection status before emitting events

### 2. Error Handling
- Check response types before processing data
- Implement fallback UI states for errors
- Log errors for debugging
- Provide user-friendly error messages

### 3. Performance
- Debounce rapid location updates for UI performance
- Cache checkpoint data to reduce redundant processing
- Use efficient data structures for route visualization
- Implement proper cleanup on component unmount

### 4. Security
- Never expose JWT tokens in logs
- Validate all incoming data
- Implement proper token refresh mechanisms
- Use HTTPS in production environments

## Support

For technical support or questions about this API, contact the development team or refer to the main API documentation.

---

**Last Updated:** August 27, 2025  
**API Version:** 1.0  
**Socket.IO Version:** 4.8.1
