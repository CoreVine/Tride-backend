# Flutter Payment Integration Guide - Tride Backend

## Overview
This guide provides Flutter developers with complete information about integrating Tride's payment system. The system uses a subscription-based model with Paymob payment gateway integration.

## Payment Flow Summary
1. **Get Available Plans** → View subscription options
2. **Create Subscription** → Subscribe to a plan and get payment URL
3. **Payment Processing** → Redirect to Paymob gateway
4. **Payment Confirmation** → Confirm payment completion
5. **Subscription Management** → Check status and extend subscriptions

---

## 🔐 Authentication Requirements

All payment APIs require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 API Endpoints Reference

### 1. Get Available Plans
**Endpoint:** `GET /api/ride/plans`
**Purpose:** Retrieve all available subscription plans
**Authentication:** Required

#### Request
```http
GET /api/ride/plans
Authorization: Bearer <jwt_token>
```

#### Response
```json
{
  "success": true,
  "message": "Plans retrieved successfully",
  "data": [
    {
      "id": 1,
      "type": "monthly",
      "duration_months": 1,
      "price_per_km": 25.0,
      "discount_percentage": 0.0,
      "created_at": "2025-01-02T10:00:00.000Z",
      "updated_at": "2025-01-02T10:00:00.000Z"
    },
    {
      "id": 2,
      "type": "3months",
      "duration_months": 3,
      "price_per_km": 25.0,
      "discount_percentage": 0.0,
      "created_at": "2025-01-02T10:00:00.000Z",
      "updated_at": "2025-01-02T10:00:00.000Z"
    },
    {
      "id": 3,
      "type": "6months",
      "duration_months": 6,
      "price_per_km": 25.0,
      "discount_percentage": 0.0,
      "created_at": "2025-01-02T10:00:00.000Z",
      "updated_at": "2025-01-02T10:00:00.000Z"
    }
  ]
}
```

#### Flutter Implementation
```dart
Future<List<Plan>> getAvailablePlans() async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/ride/plans'),
    headers: {
      'Authorization': 'Bearer $jwtToken',
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    return (data['data'] as List)
        .map((plan) => Plan.fromJson(plan))
        .toList();
  }
  throw Exception('Failed to load plans');
}
```

---

### 2. Check Subscription Status
**Endpoint:** `GET /api/ride/group/{rideGroupId}/subscription`
**Purpose:** Check current subscription status for a ride group
**Authentication:** Required

#### Request
```http
GET /api/ride/group/123/subscription
Authorization: Bearer <jwt_token>
```

#### Response - Active Subscription
```json
{
  "success": true,
  "message": "Subscription found",
  "data": {
    "id": 45,
    "parent_group_id": 123,
    "plan_id": 1,
    "status": "active",
    "valid_from": "2025-01-01T00:00:00.000Z",
    "valid_until": "2025-02-01T00:00:00.000Z",
    "total_amount": 1500.0,
    "created_at": "2025-01-01T10:00:00.000Z",
    "updated_at": "2025-01-01T10:00:00.000Z",
    "plan": {
      "id": 1,
      "type": "monthly",
      "duration_months": 1,
      "price_per_km": 25.0
    },
    "is_expired": false,
    "days_remaining": 25
  }
}
```

#### Response - No Subscription
```json
{
  "success": false,
  "message": "No active subscription found",
  "data": null
}
```

#### Flutter Implementation
```dart
Future<SubscriptionStatus?> checkSubscriptionStatus(int rideGroupId) async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/ride/group/$rideGroupId/subscription'),
    headers: {
      'Authorization': 'Bearer $jwtToken',
      'Content-Type': 'application/json',
    },
  );

  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    if (data['success']) {
      return SubscriptionStatus.fromJson(data['data']);
    }
  }
  return null; // No active subscription
}
```

---

### 3. Create New Subscription
**Endpoint:** `POST /api/ride/group/{rideGroupId}/subscribe`
**Purpose:** Subscribe to a plan and get payment URL
**Authentication:** Required

#### Request
```http
POST /api/ride/group/123/subscribe
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "plan_id": 1
}
```

#### Response - Success
```json
{
  "success": true,
  "message": "Subscription created successfully",
  "data": {
    "subscription_id": 45,
    "payment_url": "https://accept.paymob.com/api/acceptance/iframes/123456?payment_token=xyz789",
    "order_id": "ORDER_123456789",
    "amount": 1500.0,
    "currency": "EGP",
    "plan_details": {
      "type": "monthly",
      "duration_months": 1,
      "valid_until": "2025-02-01T00:00:00.000Z"
    }
  }
}
```

#### Response - Error (Already Subscribed)
```json
{
  "success": false,
  "message": "Parent group already has an active subscription",
  "error": "ALREADY_SUBSCRIBED"
}
```

#### Flutter Implementation
```dart
Future<PaymentResponse> createSubscription(int rideGroupId, int planId) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/ride/group/$rideGroupId/subscribe'),
    headers: {
      'Authorization': 'Bearer $jwtToken',
      'Content-Type': 'application/json',
    },
    body: json.encode({'plan_id': planId}),
  );

  final data = json.decode(response.body);
  
  if (response.statusCode == 200 && data['success']) {
    return PaymentResponse.fromJson(data['data']);
  }
  
  throw Exception(data['message'] ?? 'Subscription failed');
}
```

---

### 4. Extend Existing Subscription
**Endpoint:** `POST /api/ride/group/{rideGroupId}/extend`
**Purpose:** Extend current subscription with additional time
**Authentication:** Required

#### Request
```http
POST /api/ride/group/123/extend
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "plan_id": 2
}
```

#### Response - Success
```json
{
  "success": true,
  "message": "Subscription extension created successfully",
  "data": {
    "subscription_id": 45,
    "payment_url": "https://accept.paymob.com/api/acceptance/iframes/123456?payment_token=abc123",
    "order_id": "EXT_123456789",
    "amount": 4200.0,
    "currency": "EGP",
    "extension_details": {
      "current_valid_until": "2025-02-01T00:00:00.000Z",
      "new_valid_until": "2025-05-01T00:00:00.000Z",
      "additional_months": 3
    }
  }
}
```

#### Response - Error (No Subscription)
```json
{
  "success": false,
  "message": "No subscription found to extend",
  "error": "NO_SUBSCRIPTION"
}
```

#### Flutter Implementation
```dart
Future<PaymentResponse> extendSubscription(int rideGroupId, int planId) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/ride/group/$rideGroupId/extend'),
    headers: {
      'Authorization': 'Bearer $jwtToken',
      'Content-Type': 'application/json',
    },
    body: json.encode({'plan_id': planId}),
  );

  final data = json.decode(response.body);
  
  if (response.statusCode == 200 && data['success']) {
    return PaymentResponse.fromJson(data['data']);
  }
  
  throw Exception(data['message'] ?? 'Extension failed');
}
```

---

### 5. Confirm Payment
**Endpoint:** `POST /api/ride/group/subscribe/confirm`
**Purpose:** Confirm payment completion and update subscription status
**Authentication:** Required

#### Request
```http
POST /api/ride/group/subscribe/confirm
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "order_id": "ORDER_123456789"
}
```

#### Response - Payment Successful
```json
{
  "success": true,
  "message": "Payment confirmed successfully",
  "data": {
    "payment_status": "completed",
    "subscription_status": "active",
    "valid_until": "2025-02-01T00:00:00.000Z",
    "amount_paid": 1500.0,
    "transaction_id": "TXN_987654321"
  }
}
```

#### Response - Payment Pending
```json
{
  "success": false,
  "message": "Payment is still pending",
  "data": {
    "payment_status": "pending",
    "should_retry": true
  }
}
```

#### Response - Payment Failed
```json
{
  "success": false,
  "message": "Payment failed",
  "data": {
    "payment_status": "failed",
    "should_retry": false,
    "error_reason": "Insufficient funds"
  }
}
```

#### Flutter Implementation
```dart
Future<PaymentConfirmation> confirmPayment(String orderId) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/ride/group/subscribe/confirm'),
    headers: {
      'Authorization': 'Bearer $jwtToken',
      'Content-Type': 'application/json',
    },
    body: json.encode({'order_id': orderId}),
  );

  final data = json.decode(response.body);
  return PaymentConfirmation.fromJson(data);
}
```

---

## 🔄 Complete Payment Flow Implementation

### Step-by-Step Flutter Implementation

```dart
class PaymentService {
  final String baseUrl;
  final String jwtToken;

  PaymentService({required this.baseUrl, required this.jwtToken});

  // Complete payment flow for new subscription
  Future<bool> processNewSubscription(int rideGroupId, int planId) async {
    try {
      // Step 1: Create subscription
      final paymentResponse = await createSubscription(rideGroupId, planId);
      
      // Step 2: Open payment URL in WebView
      final paymentSuccess = await openPaymentWebView(paymentResponse.paymentUrl);
      
      if (!paymentSuccess) return false;
      
      // Step 3: Confirm payment with polling
      return await confirmPaymentWithPolling(paymentResponse.orderId);
      
    } catch (e) {
      print('Payment error: $e');
      return false;
    }
  }

  // Complete payment flow for subscription extension
  Future<bool> processSubscriptionExtension(int rideGroupId, int planId) async {
    try {
      // Step 1: Extend subscription
      final paymentResponse = await extendSubscription(rideGroupId, planId);
      
      // Step 2: Open payment URL in WebView
      final paymentSuccess = await openPaymentWebView(paymentResponse.paymentUrl);
      
      if (!paymentSuccess) return false;
      
      // Step 3: Confirm payment with polling
      return await confirmPaymentWithPolling(paymentResponse.orderId);
      
    } catch (e) {
      print('Extension error: $e');
      return false;
    }
  }

  // Payment confirmation with polling
  Future<bool> confirmPaymentWithPolling(String orderId) async {
    const maxAttempts = 12; // 2 minutes with 10-second intervals
    const pollInterval = Duration(seconds: 10);
    
    for (int attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        final confirmation = await confirmPayment(orderId);
        
        if (confirmation.success && confirmation.data['payment_status'] == 'completed') {
          return true;
        }
        
        if (!confirmation.data['should_retry']) {
          return false; // Payment failed permanently
        }
        
        // Wait before next attempt
        await Future.delayed(pollInterval);
        
      } catch (e) {
        print('Confirmation attempt $attempt failed: $e');
        if (attempt == maxAttempts - 1) return false;
        await Future.delayed(pollInterval);
      }
    }
    
    return false; // Timeout
  }

  // Open payment WebView
  Future<bool> openPaymentWebView(String paymentUrl) async {
    // Use webview_flutter or url_launcher
    // Return true if payment completed, false if cancelled
    
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PaymentWebView(url: paymentUrl),
      ),
    );
    
    return result == true;
  }
}
```

---

## 📱 UI Flow Recommendations

### 1. Subscription Status Screen
```dart
Widget buildSubscriptionStatus(SubscriptionStatus? status) {
  if (status == null) {
    return Column(
      children: [
        Text('No Active Subscription'),
        ElevatedButton(
          onPressed: () => showPlanSelection(),
          child: Text('Subscribe Now'),
        ),
      ],
    );
  }

  return Column(
    children: [
      Text('Active until: ${status.validUntil}'),
      Text('${status.daysRemaining} days remaining'),
      if (status.daysRemaining <= 7)
        ElevatedButton(
          onPressed: () => showExtensionOptions(),
          child: Text('Extend Subscription'),
        ),
    ],
  );
}
```

### 2. Plan Selection Screen
```dart
Widget buildPlanSelection(List<Plan> plans) {
  return ListView.builder(
    itemCount: plans.length,
    itemBuilder: (context, index) {
      final plan = plans[index];
      return Card(
        child: ListTile(
          title: Text(plan.getDisplayName()),
          subtitle: Text('${plan.durationMonths} months'),
          trailing: Text('${plan.pricePerKm} EGP/km'),
          onTap: () => selectPlan(plan),
        ),
      );
    },
  );
}
```

### 3. Payment WebView
```dart
class PaymentWebView extends StatefulWidget {
  final String url;
  
  const PaymentWebView({Key? key, required this.url}) : super(key: key);

  @override
  _PaymentWebViewState createState() => _PaymentWebViewState();
}

class _PaymentWebViewState extends State<PaymentWebView> {
  late WebViewController controller;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Payment'),
        actions: [
          IconButton(
            icon: Icon(Icons.close),
            onPressed: () => Navigator.pop(context, false),
          ),
        ],
      ),
      body: WebView(
        initialUrl: widget.url,
        javascriptMode: JavascriptMode.unrestricted,
        onWebViewCreated: (WebViewController webViewController) {
          controller = webViewController;
        },
        onPageFinished: (String url) {
          // Check if payment completed based on URL
          if (url.contains('success') || url.contains('completed')) {
            Navigator.pop(context, true);
          } else if (url.contains('failed') || url.contains('cancelled')) {
            Navigator.pop(context, false);
          }
        },
      ),
    );
  }
}
```

---

## 🔍 Error Handling

### Common Error Scenarios

| Error Code | Description | Action |
|------------|-------------|---------|
| `ALREADY_SUBSCRIBED` | User already has active subscription | Show extend option |
| `NO_SUBSCRIPTION` | No subscription to extend | Show subscribe option |
| `INVALID_PLAN` | Plan ID doesn't exist | Refresh plans list |
| `PAYMENT_FAILED` | Payment processing failed | Allow retry |
| `INSUFFICIENT_FUNDS` | Payment declined | Show error message |
| `NETWORK_ERROR` | API call failed | Retry with exponential backoff |

### Error Handling Implementation
```dart
class PaymentError extends Exception {
  final String code;
  final String message;
  
  PaymentError(this.code, this.message);
  
  @override
  String toString() => 'PaymentError($code): $message';
}

void handlePaymentError(dynamic error) {
  if (error is PaymentError) {
    switch (error.code) {
      case 'ALREADY_SUBSCRIBED':
        showExtensionDialog();
        break;
      case 'NO_SUBSCRIPTION':
        showSubscriptionDialog();
        break;
      case 'PAYMENT_FAILED':
        showRetryDialog();
        break;
      default:
        showGenericErrorDialog(error.message);
    }
  }
}
```

---

## 📊 Pricing Calculation

The backend calculates prices based on:
- **Distance**: Round trip (home ↔ school) × 2
- **Rate**: 25 EGP per kilometer
- **Duration**: Plan duration in months
- **Seats**: Number of children
- **Days**: Days per week (typically 5)

### Formula
```
Total Price = Round Trip Distance × 25 EGP/km × Seats × Days/Week × 4 weeks × Months
```

### Example Calculation
- Distance: 10km one way (20km round trip)
- Plan: 3 months
- Seats: 2 children
- Days: 5 days/week

```
Price = 20km × 25 EGP/km × 2 seats × 5 days × 4 weeks × 3 months
Price = 20 × 25 × 2 × 5 × 4 × 3 = 30,000 EGP
```

---

## 🔐 Security Considerations

1. **Always validate JWT tokens** before API calls
2. **Use HTTPS** for all API communications
3. **Don't store sensitive payment data** in the app
4. **Implement proper session management**
5. **Handle payment URLs securely** in WebView
6. **Validate server responses** before processing

---

## 🧪 Testing Checklist

### Payment Flow Testing
- [ ] Get plans list successfully
- [ ] Check subscription status (active/inactive)
- [ ] Create new subscription
- [ ] Payment WebView opens correctly
- [ ] Payment confirmation works
- [ ] Extend existing subscription
- [ ] Handle payment failures
- [ ] Handle network errors
- [ ] Test with expired subscriptions
- [ ] Test with invalid plan IDs

### Edge Cases
- [ ] Multiple rapid payment attempts
- [ ] Network interruption during payment
- [ ] App backgrounding during payment
- [ ] Invalid JWT token handling
- [ ] Server maintenance scenarios

---

## 📞 Support Information

For technical support or API issues:
- Backend API Documentation: Available in project repository
- Payment Gateway: Paymob integration
- Error Logs: Check server logs for detailed error information

---

## 📝 Model Classes (Dart)

```dart
class Plan {
  final int id;
  final String type;
  final int durationMonths;
  final double pricePerKm;
  final double discountPercentage;

  Plan({
    required this.id,
    required this.type,
    required this.durationMonths,
    required this.pricePerKm,
    required this.discountPercentage,
  });

  factory Plan.fromJson(Map<String, dynamic> json) {
    return Plan(
      id: json['id'],
      type: json['type'],
      durationMonths: json['duration_months'],
      pricePerKm: json['price_per_km'].toDouble(),
      discountPercentage: json['discount_percentage'].toDouble(),
    );
  }

  String getDisplayName() {
    switch (type) {
      case 'monthly': return 'Monthly Plan';
      case '3months': return '3 Months Plan';
      case '6months': return '6 Months Plan';
      default: return type;
    }
  }
}

class SubscriptionStatus {
  final int id;
  final int parentGroupId;
  final int planId;
  final String status;
  final DateTime validFrom;
  final DateTime validUntil;
  final double totalAmount;
  final Plan plan;
  final bool isExpired;
  final int daysRemaining;

  SubscriptionStatus({
    required this.id,
    required this.parentGroupId,
    required this.planId,
    required this.status,
    required this.validFrom,
    required this.validUntil,
    required this.totalAmount,
    required this.plan,
    required this.isExpired,
    required this.daysRemaining,
  });

  factory SubscriptionStatus.fromJson(Map<String, dynamic> json) {
    return SubscriptionStatus(
      id: json['id'],
      parentGroupId: json['parent_group_id'],
      planId: json['plan_id'],
      status: json['status'],
      validFrom: DateTime.parse(json['valid_from']),
      validUntil: DateTime.parse(json['valid_until']),
      totalAmount: json['total_amount'].toDouble(),
      plan: Plan.fromJson(json['plan']),
      isExpired: json['is_expired'],
      daysRemaining: json['days_remaining'],
    );
  }
}

class PaymentResponse {
  final int subscriptionId;
  final String paymentUrl;
  final String orderId;
  final double amount;
  final String currency;

  PaymentResponse({
    required this.subscriptionId,
    required this.paymentUrl,
    required this.orderId,
    required this.amount,
    required this.currency,
  });

  factory PaymentResponse.fromJson(Map<String, dynamic> json) {
    return PaymentResponse(
      subscriptionId: json['subscription_id'],
      paymentUrl: json['payment_url'],
      orderId: json['order_id'],
      amount: json['amount'].toDouble(),
      currency: json['currency'],
    );
  }
}

class PaymentConfirmation {
  final bool success;
  final String message;
  final Map<String, dynamic> data;

  PaymentConfirmation({
    required this.success,
    required this.message,
    required this.data,
  });

  factory PaymentConfirmation.fromJson(Map<String, dynamic> json) {
    return PaymentConfirmation(
      success: json['success'],
      message: json['message'],
      data: json['data'] ?? {},
    );
  }
}
```

This guide provides everything a Flutter developer needs to integrate with the Tride payment system. All API endpoints, request/response formats, error handling, and implementation examples are included. 