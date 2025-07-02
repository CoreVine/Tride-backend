# Tride Ride Group API Reference

This document provides a comprehensive guide to the Tride Ride Group API, including detailed endpoint documentation, request/response formats, and implementation workflows.

## Table of Contents

- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Creating a Ride Group](#creating-a-ride-group)
- [Managing Group Members](#managing-group-members)
- [Subscription Management](#subscription-management)
- [Error Handling](#error-handling)
- [Implementation Workflow](#implementation-workflow)

## Authentication

All API requests require authentication using a JWT token in the Authorization header:

```http
Authorization: Bearer {jwt_token}
```

Users must have:
- A verified email
- A valid parent profile

## API Endpoints

### Ride Group Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ride/plans` | Get all available subscription plans |
| GET | `/ride/group/:rideGroupId` | Get a specific ride group by ID |
| GET | `/ride/groups/:parentId` | Get all ride groups for a parent |
| POST | `/ride/group/create` | Create a new ride group |
| POST | `/ride/group/add-child` | Add children to a ride group |
| POST | `/ride/group/add-parent/:invitation_code` | Add a parent to a ride group using invitation code |

### Subscription Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ride/group/:rideGroupId/subscription` | Get current subscription status |
| PUT | `/ride/group/:rideGroupId/subscription` | Update current subscription status |
| GET | `/ride/group/:rideGroupId/plans` | Get available plans for a specific group |
| POST | `/ride/group/:rideGroupId/subscribe` | Create a new subscription request |
| POST | `/ride/group/subscribe/confirm` | Confirm a subscription payment |
| POST | `/ride/group/:rideGroupId/extend` | Extend an existing subscription |
| PUT | `/ride/group/subscription-status/:subscriptionStatusId` | Update subscription status |

## Creating a Ride Group

### 1. Get Available Plans

**Request:**
```http
GET /ride/plans
```

**Response:**
```json
{
  "success": true,
  "message": "Plans fetched successfully",
  "data": {
    "plans": [
      {
        "id": "plan_id",
        "type": "monthly",
        "name": "Monthly Plan",
        "months_count": 1,
        "price_per_km": 1.5
      },
      {
        "id": "plan_id2",
        "type": "term",
        "name": "Term Plan",
        "months_count": 3,
        "price_per_km": 1.2
      }
    ]
  }
}
```

### 2. Create a Ride Group

**Request:**
```http
POST /ride/group/create
Content-Type: application/json

{
  "group_name": "School Carpool",
  "school_id": "school_123",
  "seats": 3,
  "home": {
    "home_lat": "31.12345",
    "home_lng": "29.98765"
  },
  "children": [
    {
      "child_id": "child_123",
      "timing_from": "07:30",
      "timing_to": "14:30"
    }
  ],
  "days": ["Sunday", "Monday", "Wednesday"],
  "group_type": "regular"
}
```

**Response:**
```json
{
  "success": true,
  "message": "A new ride group has been created successfully",
  "data": {
    "rideGroup": {
      "id": "group_123",
      "group_name": "School Carpool",
      "invite_code": "AB123XYZ",
      "current_seats_taken": 3
    }
  }
}
```

## Managing Group Members

### 1. Add Children to Group

**Request:**
```http
POST /ride/group/add-child
Content-Type: application/json

{
  "group_id": "group_123",
  "children": [
    {
      "child_id": "child_456",
      "timing_from": "07:30",
      "timing_to": "14:30"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Children have been added to the group successfully",
  "data": {
    "children": [
      {
        "id": "child_group_123",
        "child_id": "child_456",
        "parent_group_id": "parent_group_123",
        "timing_from": "07:30",
        "timing_to": "14:30"
      }
    ]
  }
}
```

### 2. Add Parent to Group (Using Invitation)

**Request:**
```http
POST /ride/group/add-parent/AB123XYZ
Content-Type: application/json

{
  "group_id": "group_123",
  "home": {
    "home_lat": "31.12345",
    "home_lng": "29.98765"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "You have been added to the ride group successfully",
  "data": {
    "rideGroup": {
      "id": "group_123",
      "group_name": "School Carpool",
      "invite_code": "AB123XYZ",
      "parentGroup": {
        "id": "parent_group_456",
        "parent_id": "parent_123",
        "group_id": "group_123",
        "home_lat": "31.12345",
        "home_lng": "29.98765"
      }
    }
  }
}
```

## Subscription Management

### 1. Get Available Plans for a Group

**Request:**
```http
GET /ride/group/group_123/plans
```

**Response:**
```json
{
  "success": true,
  "message": "Available plans fetched successfully",
  "data": {
    "factors": {
      "seatsTaken": 2,
      "daysPerWeek": 3
    },
    "plans": [
      {
        "id": "plan_123",
        "type": "monthly",
        "name": "Monthly Plan",
        "months_count": 1,
        "totalDistance": "240 km",
        "totalDays": 12,
        "overallPrice": 1200,
        "toPayPrice": 1200
      },
      {
        "id": "plan_456",
        "type": "term",
        "name": "Term Plan",
        "months_count": 3,
        "totalDistance": "720 km",
        "totalDays": 36,
        "overallPrice": 3200,
        "toPayPrice": 3200
      }
    ]
  }
}
```

### 2. Create a New Subscription

**Request:**
```http
POST /ride/group/group_123/subscribe
Content-Type: application/json

{
  "plan_type": "monthly"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Next payment details fetched successfully",
  "data": {
    "paymentRedirectUrl": "https://payment.paymob.com/checkout?publicKey=xxx&clientSecret=yyy",
    "orderDetails": {
      "orderId": "order_123",
      "planType": "monthly",
      "seats": 2,
      "total_days": 3,
      "distance": 5.2,
      "overallPrice": 1200,
      "toPayPrice": 1200
    }
  }
}
```

### 3. Confirm Subscription After Payment

**Request:**
```http
POST /ride/group/subscribe/confirm
Content-Type: application/json

{
  "order_id": "order_123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription with order id is paid successfully"
}
```

### 4. Get Current Subscription Status

**Request:**
```http
GET /ride/group/group_123/subscription
```

**Response:**
```json
{
  "success": true,
  "message": "Current subscription status fetched successfully",
  "data": {
    "subscription": {
      "id": "subscription_123",
      "status": "active",
      "start_date": "2023-09-01T00:00:00.000Z",
      "end_date": "2023-10-01T00:00:00.000Z",
      "parent_id": "parent_123",
      "group_id": "group_123",
      "current_seats_taken": 2,
      "pickup_days_count": 3
    }
  }
}
```

### 5. Update Subscription Status

**Request:**
```http
PUT /ride/group/group_123/subscription
Content-Type: application/json

{
  "status": "remove"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Current subscription status updated successfully",
  "data": {
    "subscription": {
      "id": "subscription_123",
      "status": "remove",
      "start_date": "2023-09-01T00:00:00.000Z",
      "end_date": "2023-10-01T00:00:00.000Z"
    }
  }
}
```

### 6. Extend an Existing Subscription

**Request:**
```http
POST /ride/group/group_123/extend
Content-Type: application/json

{
  "plan_type": "monthly"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Extension payment details fetched successfully",
  "data": {
    "paymentRedirectUrl": "https://payment.paymob.com/checkout?publicKey=xxx&clientSecret=yyy",
    "orderDetails": {
      "orderId": "order_456",
      "planType": "monthly",
      "seats": 2,
      "total_days": 3,
      "distance": 5.2,
      "overallPrice": 1200,
      "toPayPrice": 1200,
      "extensionMonths": 1
    }
  }
}
```

## Error Handling

The API returns standardized error responses with appropriate HTTP status codes:

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Error message here"
  }
}
```

Common error codes:
- `BAD_REQUEST` (400): Invalid parameters or request body
- `UNAUTHORIZED` (401): Missing or invalid authentication token
- `FORBIDDEN` (403): Account email not verified or other permission issues
- `NOT_FOUND` (404): Requested resource not found

## Implementation Workflow

### Complete Ride Group Creation and Subscription Flow:

1. **Authentication**: Ensure user is logged in with JWT token
2. **Create Ride Group**: 
   - POST to `/ride/group/create` with group details
   - Save the returned `invite_code` for sharing
3. **Add Children**: 
   - POST to `/ride/group/add-child` with children details
4. **Get Available Plans**: 
   - GET from `/ride/group/{groupId}/plans`
   - Display plan options to user
5. **Create Subscription**: 
   - POST to `/ride/group/{groupId}/subscribe` with selected plan
   - Redirect user to the payment page using `paymentRedirectUrl`
6. **Payment Confirmation**: 
   - After payment, POST to `/ride/group/subscribe/confirm` with `order_id`
   - Poll this endpoint if necessary to confirm payment status
7. **Subscription Management**:
   - Check subscription status with GET to `/ride/group/{groupId}/subscription`
   - Allow users to extend or cancel subscriptions as needed

### Joining an Existing Group:

1. **Receive Invitation Code**: Get the 8-character invite code from group creator
2. **Join Group**: 
   - POST to `/ride/group/add-parent/{invite_code}` with home location
   - Add children to the group if needed
3. **Subscribe**: Follow the subscription flow above

### Payment Integration:

For payment processing, integrate with a WebView or external browser:
- Open the `paymentRedirectUrl` in a WebView
- Handle the redirect after payment completion
- Confirm the payment status by polling the confirmation endpoint
