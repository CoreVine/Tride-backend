# 💬 Flutter Chat System Integration Guide

## 📚 Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Setup & Dependencies](#setup--dependencies)
4. [Authentication & Authorization](#authentication--authorization)
5. [Socket.IO Integration](#socketio-integration)
6. [Chat Room Management](#chat-room-management)
7. [Messaging System](#messaging-system)
8. [Real-time Events](#real-time-events)
9. [File Upload & Media](#file-upload--media)
10. [Error Handling](#error-handling)
11. [Flutter Code Examples](#flutter-code-examples)
12. [Best Practices](#best-practices)

---

## 🎯 Overview

The Tride chat system supports real-time messaging for:
- **Ride Group Chats**: Communication between parents and drivers in ride groups
- **Customer Support**: Support chats between users and admins
- **Private Chats**: Direct messaging between users

### Key Features
- Real-time messaging via Socket.IO
- Message types: Text, Image, Video, Audio, Document, Location
- Message status tracking (sent, delivered, read)
- Message replies and deletion
- Pagination for message history
- Push notifications
- File upload support

---

## 🏗️ System Architecture

```
Flutter App
    ↓
┌─── HTTP API ───┐    ┌─── Socket.IO ───┐
│  • Auth        │    │  • Real-time    │
│  • Chat Rooms  │    │  • Join/Leave   │
│  • Messages    │    │  • Live Updates │
│  • File Upload │    │  • Notifications│
└────────────────┘    └─────────────────┘
    ↓                          ↓
┌─────────── Backend Server ──────────┐
│  • Authentication & Authorization   │
│  • Chat Room Management            │
│  • Message Processing              │
│  • File Storage (Cloudinary/S3)    │
│  • Push Notifications              │
└────────────────────────────────────┘
    ↓
┌─── Database ───┐
│  • MongoDB     │ (Chat Rooms, Messages)
│  • PostgreSQL  │ (Users, Ride Groups)
│  • Redis       │ (Socket Connections)
└────────────────┘
```

---

## 📦 Setup & Dependencies

### Required Flutter Packages
```yaml
dependencies:
  http: ^1.1.0
  socket_io_client: ^2.0.3+1
  dio: ^5.3.2
  get_it: ^7.6.4
  provider: ^6.1.1
  file_picker: ^6.1.1
  image_picker: ^1.0.4
  cached_network_image: ^3.3.0
  flutter_local_notifications: ^16.3.0
```

---

## 🔐 Authentication & Authorization

### User Types & Permissions
- **Parent**: Member of ride groups, can access customer support
- **Driver**: Member of ride groups, can access customer support  
- **Admin**: Can view chat history, manage customer support

### Required Headers
```dart
Map<String, String> getHeaders() {
  return {
    'Authorization': 'Bearer $jwtToken',
    'Content-Type': 'application/json',
  };
}
```

### User Verification Requirements
- Email must be verified
- **Parents**: Documents must be approved
- **Drivers**: Papers must be approved

---

## 🔌 Socket.IO Integration

### 1. Initialize Socket Connection
```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  IO.Socket? _socket;
  
  Future<void> connect(String token) async {
    _socket = IO.io('https://your-backend-url', 
      IO.OptionBuilder()
        .setTransports(['websocket'])
        .setAuth({
          'token': token,
        })
        .build()
    );
    
    _socket!.connect();
    
    // Listen for connection events
    _socket!.onConnect((_) {
      print('Connected to chat server');
    });
    
    _socket!.onDisconnect((_) {
      print('Disconnected from chat server');
    });
    
    _socket!.onConnectError((error) {
      print('Connection error: $error');
    });
  }
}
```

### 2. Socket Events

#### Events You Can Emit
```dart
// Join a chat room
void joinRoom(String roomId) {
  _socket?.emit('join_room', roomId);
}

// Leave a chat room
void leaveRoom(String roomId) {
  _socket?.emit('leave_room', roomId);
}

// Join ride tracking (for drivers/parents)
void joinRideTracking(Map<String, dynamic> payload) {
  _socket?.emit('parent_watch_ride', payload); // For parents
  _socket?.emit('driver_join_ride', payload);  // For drivers
}
```

#### Events You Can Listen To
```dart
void setupEventListeners() {
  // New message received
  _socket?.on('new_chat_message', (data) {
    handleNewMessage(data);
  });
  
  // Message deleted
  _socket?.on('message_deleted', (data) {
    handleMessageDeleted(data);
  });
  
  // System message
  _socket?.on('system_message', (data) {
    handleSystemMessage(data);
  });
  
  // Push notification
  _socket?.on('new_notification', (data) {
    handleNotification(data);
  });
  
  // Location updates (for ride tracking)
  _socket?.on('location_update', (data) {
    handleLocationUpdate(data);
  });
}
```

---

## 🏠 Chat Room Management

### Get Chat Room for Ride Group
```dart
Future<Map<String, dynamic>?> getRideGroupChatRoom(String rideGroupId) async {
  try {
    final response = await http.get(
      Uri.parse('$baseUrl/api/chat/ride-group/$rideGroupId/room'),
      headers: getHeaders(),
    );
    
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['data'];
    }
    return null;
  } catch (e) {
    print('Error getting chat room: $e');
    return null;
  }
}
```

### Get All User's Chat Rooms
```dart
Future<List<Map<String, dynamic>>> getUserChatRooms() async {
  try {
    final response = await http.get(
      Uri.parse('$baseUrl/api/chat/ride-group/rooms'),
      headers: getHeaders(),
    );
    
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return List<Map<String, dynamic>>.from(data['data']);
    }
    return [];
  } catch (e) {
    print('Error getting chat rooms: $e');
    return [];
  }
}
```

### Create Customer Support Room
```dart
Future<Map<String, dynamic>?> createCustomerSupportRoom() async {
  try {
    final response = await http.post(
      Uri.parse('$baseUrl/api/chat/customer-support/room'),
      headers: getHeaders(),
    );
    
    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = json.decode(response.body);
      return data['data'];
    }
    return null;
  } catch (e) {
    print('Error creating customer support room: $e');
    return null;
  }
}
```

---

## 💬 Messaging System

### Message Types
```dart
enum MessageType {
  text,
  image,
  video,
  audio,
  document,
  location,
}

enum MessageStatus {
  sent,
  delivered,
  read,
}

class ChatMessage {
  final String id;
  final String chatRoomId;
  final int senderId;
  final String senderType; // "parent", "driver", "admin"
  final MessageType type;
  final String? message;
  final String? mediaUrl;
  final bool isSystem;
  final MessageStatus status;
  final String? replyTo;
  final bool isDeleted;
  final DateTime createdAt;
  
  ChatMessage({
    required this.id,
    required this.chatRoomId,
    required this.senderId,
    required this.senderType,
    required this.type,
    this.message,
    this.mediaUrl,
    this.isSystem = false,
    this.status = MessageStatus.sent,
    this.replyTo,
    this.isDeleted = false,
    required this.createdAt,
  });
  
  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['_id'],
      chatRoomId: json['chat_room_id'],
      senderId: json['sender_id'],
      senderType: json['sender_type'],
      type: MessageType.values.firstWhere(
        (e) => e.toString().split('.').last == json['type'],
      ),
      message: json['message'],
      mediaUrl: json['media_url'],
      isSystem: json['is_system'] ?? false,
      status: MessageStatus.values.firstWhere(
        (e) => e.toString().split('.').last == json['status'],
      ),
      replyTo: json['reply_to'],
      isDeleted: json['is_deleted'] ?? false,
      createdAt: DateTime.parse(json['created_at']),
    );
  }
}
```

### Get Messages (Generic - Works for All Room Types) 🆕
```dart
Future<Map<String, dynamic>> getRoomMessages(String roomId, {int page = 1}) async {
  try {
    final response = await http.get(
      Uri.parse('$baseUrl/api/chat/room/$roomId/messages?page=$page'),
      headers: getHeaders(),
    );
    
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return {
        'messages': (data['data']['messages'] as List)
            .map((m) => ChatMessage.fromJson(m))
            .toList(),
        'pagination': data['data']['pagination'],
        'room': data['data']['room'],
      };
    }
    throw Exception('Failed to get messages');
  } catch (e) {
    print('Error getting messages: $e');
    rethrow;
  }
}
```

### Send Text Message
```dart
Future<bool> sendTextMessage(String roomId, String message, {String? replyTo}) async {
  try {
    final response = await http.post(
      Uri.parse('$baseUrl/api/chat/messages/$roomId/message'),
      headers: getHeaders(),
      body: json.encode({
        'type': 'text',
        'message': message,
        if (replyTo != null) 'reply_to': replyTo,
      }),
    );
    
    return response.statusCode == 201;
  } catch (e) {
    print('Error sending message: $e');
    return false;
  }
}
```

### Send Media Message
```dart
Future<bool> sendMediaMessage(
  String roomId, 
  File file, 
  MessageType type,
  {String? replyTo}
) async {
  try {
    // First upload the file
    final uploadResponse = await uploadFile(file);
    if (uploadResponse == null) return false;
    
    // Then send message with media URL
    final response = await http.post(
      Uri.parse('$baseUrl/api/chat/messages/$roomId/media'),
      headers: getHeaders(),
      body: json.encode({
        'type': type.toString().split('.').last,
        'media_url': uploadResponse['url'],
        if (replyTo != null) 'reply_to': replyTo,
      }),
    );
    
    return response.statusCode == 201;
  } catch (e) {
    print('Error sending media message: $e');
    return false;
  }
}
```

### Delete Message
```dart
Future<bool> deleteMessage(String messageId) async {
  try {
    final response = await http.delete(
      Uri.parse('$baseUrl/api/chat/messages/$messageId'),
      headers: getHeaders(),
    );
    
    return response.statusCode == 200;
  } catch (e) {
    print('Error deleting message: $e');
    return false;
  }
}
```

---

## 📁 File Upload & Media

### Upload File
```dart
Future<Map<String, dynamic>?> uploadFile(File file) async {
  try {
    var request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/api/chat/messages/upload'),
    );
    
    request.headers.addAll(getHeaders());
    request.files.add(await http.MultipartFile.fromPath('file', file.path));
    
    final response = await request.send();
    
    if (response.statusCode == 200) {
      final responseData = await response.stream.bytesToString();
      return json.decode(responseData)['data'];
    }
    return null;
  } catch (e) {
    print('Error uploading file: $e');
    return null;
  }
}
```

### Media Message Widget
```dart
Widget buildMediaMessage(ChatMessage message) {
  switch (message.type) {
    case MessageType.image:
      return CachedNetworkImage(
        imageUrl: message.mediaUrl!,
        placeholder: (context, url) => CircularProgressIndicator(),
        errorWidget: (context, url, error) => Icon(Icons.error),
        height: 200,
        width: 200,
        fit: BoxFit.cover,
      );
      
    case MessageType.video:
      return Container(
        height: 200,
        width: 200,
        child: VideoPlayerWidget(url: message.mediaUrl!),
      );
      
    case MessageType.audio:
      return AudioPlayerWidget(url: message.mediaUrl!);
      
    case MessageType.document:
      return InkWell(
        onTap: () => _openDocument(message.mediaUrl!),
        child: Container(
          padding: EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(Icons.description),
              SizedBox(width: 8),
              Text('Document'),
            ],
          ),
        ),
      );
      
    default:
      return Text(message.message ?? '');
  }
}
```

---

## ⚡ Real-time Events

### Complete Chat Service Implementation
```dart
class ChatService extends ChangeNotifier {
  IO.Socket? _socket;
  List<ChatMessage> _messages = [];
  Map<String, dynamic>? _currentRoom;
  bool _isConnected = false;
  
  List<ChatMessage> get messages => _messages;
  Map<String, dynamic>? get currentRoom => _currentRoom;
  bool get isConnected => _isConnected;
  
  Future<void> initialize(String token) async {
    await _connectSocket(token);
    _setupEventListeners();
  }
  
  Future<void> _connectSocket(String token) async {
    _socket = IO.io('https://your-backend-url', 
      IO.OptionBuilder()
        .setTransports(['websocket'])
        .setAuth({'token': token})
        .build()
    );
    
    _socket!.onConnect((_) {
      _isConnected = true;
      notifyListeners();
    });
    
    _socket!.onDisconnect((_) {
      _isConnected = false;
      notifyListeners();
    });
    
    _socket!.connect();
  }
  
  void _setupEventListeners() {
    _socket?.on('new_chat_message', (data) {
      final message = ChatMessage.fromJson(data);
      _messages.insert(0, message);
      notifyListeners();
    });
    
    _socket?.on('message_deleted', (data) {
      _messages.removeWhere((m) => m.id == data['message_id']);
      notifyListeners();
    });
  }
  
  Future<void> enterRoom(String roomId) async {
    try {
      // Get room details
      _currentRoom = await _getRoomDetails(roomId);
      
      // Join room via socket
      _socket?.emit('join_room', roomId);
      
      // Load message history
      await loadMessages(roomId);
      
      notifyListeners();
    } catch (e) {
      print('Error entering room: $e');
    }
  }
  
  void leaveRoom() {
    if (_currentRoom != null) {
      _socket?.emit('leave_room', _currentRoom!['_id']);
      _currentRoom = null;
      _messages.clear();
      notifyListeners();
    }
  }
  
  Future<void> loadMessages(String roomId, {int page = 1}) async {
    try {
      final result = await getRoomMessages(roomId, page: page);
      if (page == 1) {
        _messages = result['messages'];
      } else {
        _messages.addAll(result['messages']);
      }
      notifyListeners();
    } catch (e) {
      print('Error loading messages: $e');
    }
  }
  
  Future<bool> sendMessage(String message, {String? replyTo}) async {
    if (_currentRoom == null) return false;
    
    return await sendTextMessage(_currentRoom!['_id'], message, replyTo: replyTo);
  }
  
  void dispose() {
    leaveRoom();
    _socket?.disconnect();
    _socket?.dispose();
    super.dispose();
  }
}
```

---

## ❌ Error Handling

### Common Error Codes
- **401**: Unauthorized (invalid token, unverified email)
- **403**: Forbidden (documents not approved, not room member)
- **404**: Room/Message not found
- **422**: Validation error (invalid room ID format)
- **500**: Server error

### Error Handling Implementation
```dart
class ApiException implements Exception {
  final int statusCode;
  final String message;
  
  ApiException(this.statusCode, this.message);
  
  @override
  String toString() => 'ApiException($statusCode): $message';
}

Future<T> handleApiCall<T>(Future<http.Response> apiCall, T Function(Map<String, dynamic>) parser) async {
  try {
    final response = await apiCall;
    final data = json.decode(response.body);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return parser(data);
    } else {
      throw ApiException(response.statusCode, data['message'] ?? 'Unknown error');
    }
  } catch (e) {
    if (e is ApiException) rethrow;
    throw ApiException(0, 'Network error: $e');
  }
}
```

---

## 🎨 Flutter Code Examples

### Complete Chat Screen
```dart
class ChatScreen extends StatefulWidget {
  final String roomId;
  
  const ChatScreen({Key? key, required this.roomId}) : super(key: key);
  
  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  late ChatService _chatService;
  
  @override
  void initState() {
    super.initState();
    _chatService = context.read<ChatService>();
    _initializeChat();
  }
  
  Future<void> _initializeChat() async {
    await _chatService.enterRoom(widget.roomId);
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Consumer<ChatService>(
          builder: (context, chatService, child) {
            return Text(chatService.currentRoom?['name'] ?? 'Chat');
          },
        ),
        actions: [
          Consumer<ChatService>(
            builder: (context, chatService, child) {
              return Icon(
                chatService.isConnected ? Icons.wifi : Icons.wifi_off,
                color: chatService.isConnected ? Colors.green : Colors.red,
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Consumer<ChatService>(
              builder: (context, chatService, child) {
                return ListView.builder(
                  controller: _scrollController,
                  reverse: true,
                  itemCount: chatService.messages.length,
                  itemBuilder: (context, index) {
                    final message = chatService.messages[index];
                    return MessageBubble(message: message);
                  },
                );
              },
            ),
          ),
          _buildMessageInput(),
        ],
      ),
    );
  }
  
  Widget _buildMessageInput() {
    return Container(
      padding: EdgeInsets.all(8),
      child: Row(
        children: [
          IconButton(
            icon: Icon(Icons.attach_file),
            onPressed: _showAttachmentOptions,
          ),
          Expanded(
            child: TextField(
              controller: _messageController,
              decoration: InputDecoration(
                hintText: 'Type a message...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(25),
                ),
              ),
              onSubmitted: _sendMessage,
            ),
          ),
          IconButton(
            icon: Icon(Icons.send),
            onPressed: () => _sendMessage(_messageController.text),
          ),
        ],
      ),
    );
  }
  
  void _sendMessage(String text) {
    if (text.trim().isEmpty) return;
    
    _chatService.sendMessage(text.trim());
    _messageController.clear();
  }
  
  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      builder: (context) => AttachmentOptionsSheet(
        onImageSelected: (file) => _sendMediaMessage(file, MessageType.image),
        onVideoSelected: (file) => _sendMediaMessage(file, MessageType.video),
        onDocumentSelected: (file) => _sendMediaMessage(file, MessageType.document),
      ),
    );
  }
  
  void _sendMediaMessage(File file, MessageType type) {
    // Implementation for sending media messages
  }
  
  @override
  void dispose() {
    _chatService.leaveRoom();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}
```

### Message Bubble Widget
```dart
class MessageBubble extends StatelessWidget {
  final ChatMessage message;
  
  const MessageBubble({Key? key, required this.message}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    final isCurrentUser = _isCurrentUser(message.senderId);
    
    return Container(
      margin: EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      child: Align(
        alignment: isCurrentUser ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
          padding: EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isCurrentUser ? Colors.blue : Colors.grey[300],
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!isCurrentUser)
                Text(
                  _getSenderName(message.senderType),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue,
                  ),
                ),
              SizedBox(height: 4),
              _buildMessageContent(),
              SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _formatTime(message.createdAt),
                    style: TextStyle(
                      fontSize: 10,
                      color: isCurrentUser ? Colors.white70 : Colors.grey[600],
                    ),
                  ),
                  if (isCurrentUser) ...[
                    SizedBox(width: 4),
                    Icon(
                      _getStatusIcon(message.status),
                      size: 12,
                      color: Colors.white70,
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildMessageContent() {
    switch (message.type) {
      case MessageType.text:
        return Text(
          message.message ?? '',
          style: TextStyle(
            color: _isCurrentUser(message.senderId) ? Colors.white : Colors.black,
          ),
        );
      case MessageType.image:
      case MessageType.video:
      case MessageType.audio:
      case MessageType.document:
        return buildMediaMessage(message);
      default:
        return Text('Unsupported message type');
    }
  }
  
  bool _isCurrentUser(int senderId) {
    // Compare with current user ID
    return senderId == getCurrentUserId();
  }
  
  String _getSenderName(String senderType) {
    switch (senderType) {
      case 'parent':
        return 'Parent';
      case 'driver':
        return 'Driver';
      case 'admin':
        return 'Admin';
      default:
        return 'User';
    }
  }
  
  String _formatTime(DateTime dateTime) {
    return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
  
  IconData _getStatusIcon(MessageStatus status) {
    switch (status) {
      case MessageStatus.sent:
        return Icons.check;
      case MessageStatus.delivered:
        return Icons.done_all;
      case MessageStatus.read:
        return Icons.done_all; // You can use different color for read
      default:
        return Icons.access_time;
    }
  }
}
```

---

## 🏆 Best Practices

### 1. Connection Management
- **Connect once**: Initialize socket connection when user logs in
- **Reconnect on failure**: Handle connection drops gracefully
- **Disconnect on logout**: Always disconnect when user logs out

### 2. Memory Management
- **Limit message cache**: Keep only recent messages in memory
- **Pagination**: Load messages in chunks
- **Dispose properly**: Clean up resources in dispose methods

### 3. User Experience
- **Show connection status**: Indicate online/offline state
- **Optimistic UI**: Show messages immediately, handle failures
- **Typing indicators**: Show when others are typing
- **Message status**: Show sent/delivered/read status

### 4. Error Handling
- **Retry mechanism**: Retry failed operations
- **Graceful degradation**: Work offline when possible
- **User feedback**: Show clear error messages

### 5. Security
- **Token validation**: Always validate JWT tokens
- **Input sanitization**: Sanitize user inputs
- **File validation**: Validate uploaded files

### 6. Performance
- **Lazy loading**: Load content as needed
- **Image caching**: Cache images for better performance
- **Debounce**: Debounce typing indicators and search

### 7. Testing
```dart
// Example test
testWidgets('Chat screen displays messages', (WidgetTester tester) async {
  // Mock chat service
  final mockChatService = MockChatService();
  when(mockChatService.messages).thenReturn([
    ChatMessage(
      id: '1',
      chatRoomId: 'room1',
      senderId: 123,
      senderType: 'parent',
      type: MessageType.text,
      message: 'Hello!',
      createdAt: DateTime.now(),
    ),
  ]);
  
  await tester.pumpWidget(
    ChangeNotifierProvider<ChatService>(
      create: (_) => mockChatService,
      child: MaterialApp(
        home: ChatScreen(roomId: 'room1'),
      ),
    ),
  );
  
  expect(find.text('Hello!'), findsOneWidget);
});
```

---

## 🚀 Quick Start Checklist

1. ✅ Add required dependencies to `pubspec.yaml`
2. ✅ Implement authentication and get JWT token
3. ✅ Initialize Socket.IO connection with token
4. ✅ Create chat service with state management
5. ✅ Build chat UI with message bubbles
6. ✅ Implement message sending/receiving
7. ✅ Add file upload functionality
8. ✅ Handle real-time events
9. ✅ Implement error handling
10. ✅ Test with different room types

---

## 📱 Sample App Structure

```
lib/
├── models/
│   ├── chat_message.dart
│   ├── chat_room.dart
│   └── user.dart
├── services/
│   ├── chat_service.dart
│   ├── socket_service.dart
│   ├── api_service.dart
│   └── file_service.dart
├── screens/
│   ├── chat_list_screen.dart
│   ├── chat_screen.dart
│   └── customer_support_screen.dart
├── widgets/
│   ├── message_bubble.dart
│   ├── media_message.dart
│   └── attachment_sheet.dart
└── utils/
    ├── constants.dart
    ├── helpers.dart
    └── error_handler.dart
```

This guide provides everything you need to integrate the Tride chat system into your Flutter app! 🎉
