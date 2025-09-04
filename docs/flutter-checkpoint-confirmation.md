# Flutter Checkpoint Confirmation Implementation

## Correct WebSocket Implementation

### Method 1: Using `emitWithAck()` (Recommended)

```dart
/// Confirm pickup for a specific checkpoint using WebSocket callback
Future<void> confirmPickup(String checkpointId) async {
  try {
    SecurityModule.logger.info('LiveTrackingCubit: Confirming pickup for checkpoint $checkpointId');
    
    // Get server index and children IDs for this checkpoint
    final serverIndex = state.getServerIndexForCheckpoint(checkpointId);
    final childrenIds = state.getChildrenIdsForCheckpoint(checkpointId);
    
    if (serverIndex == null) {
      _showError('Cannot find server mapping for checkpoint');
      return;
    }
    
    if (state.currentLocation == null) {
      _showError('Current location not available');
      return;
    }
    
    final payload = {
      'ride_group_id': int.parse(state.rideGroupId),
      'checkpoint_index': int.parse(serverIndex),
      'location': {
        'lat': state.currentLocation!.lat,
        'lng': state.currentLocation!.lng,
      },
      'children_ids': childrenIds,
    };
    
    SecurityModule.logger.info('LiveTrackingCubit: Sending checkpoint confirmation', payload);
    
    // Use emitWithAck for proper callback handling
    final response = await _socketRepository.emitWithAck(
      'driver_confirm_checkpoint', 
      payload
    ).timeout(
      const Duration(seconds: 10),
      onTimeout: () => throw TimeoutException('Checkpoint confirm timeout'),
    );
    
    SecurityModule.logger.info('LiveTrackingCubit: Received response', response);
    
    // Check response type
    if (response['type'] == 'CHECKPOINT_CONFIRMED' || response['type'] == 'RIDE_COMPLETED') {
      // Success! Update local state
      await updateCheckpointStatus(checkpointId, CheckpointStatus.confirmed);
      SecurityModule.logger.info('LiveTrackingCubit: Pickup confirmed successfully');
      
      // Handle ride completion if needed
      if (response['type'] == 'RIDE_COMPLETED') {
        SecurityModule.logger.info('LiveTrackingCubit: Ride completed!');
        _handleRideCompletion();
      }
    } else if (response['type'] == 'CHECKPOINT_CONFIRM_ERROR') {
      SecurityModule.logger.error('LiveTrackingCubit: Failed to confirm pickup: ${response['message']}');
      _showError('Failed to confirm pickup: ${response['message']}');
    } else {
      SecurityModule.logger.error('LiveTrackingCubit: Unknown response type: ${response['type']}');
      _showError('Unexpected response from server');
    }
  } catch (e) {
    SecurityModule.logger.error('LiveTrackingCubit: Failed to confirm pickup - $e');
    _showError('Failed to confirm pickup: $e');
  }
}
```

### Method 2: Using Manual Callback (Alternative)

```dart
/// Alternative implementation using manual callback
Future<void> confirmPickup(String checkpointId) async {
  try {
    SecurityModule.logger.info('LiveTrackingCubit: Confirming pickup for checkpoint $checkpointId');
    
    // Get server index and children IDs for this checkpoint
    final serverIndex = state.getServerIndexForCheckpoint(checkpointId);
    final childrenIds = state.getChildrenIdsForCheckpoint(checkpointId);
    
    if (serverIndex == null) {
      _showError('Cannot find server mapping for checkpoint');
      return;
    }
    
    if (state.currentLocation == null) {
      _showError('Current location not available');
      return;
    }
    
    final payload = {
      'ride_group_id': int.parse(state.rideGroupId),
      'checkpoint_index': int.parse(serverIndex),
      'location': {
        'lat': state.currentLocation!.lat,
        'lng': state.currentLocation!.lng,
      },
      'children_ids': childrenIds,
    };
    
    final completer = Completer<Map<String, dynamic>>();
    
    // Send with callback
    _socket.emit('driver_confirm_checkpoint', [payload, (response) {
      completer.complete(Map<String, dynamic>.from(response));
    }]);
    
    // Wait for response
    final response = await completer.future.timeout(
      const Duration(seconds: 10),
      onTimeout: () => throw TimeoutException('Checkpoint confirm timeout'),
    );
    
    SecurityModule.logger.info('LiveTrackingCubit: Received response', response);
    
    // Handle response same as Method 1
    if (response['type'] == 'CHECKPOINT_CONFIRMED' || response['type'] == 'RIDE_COMPLETED') {
      await updateCheckpointStatus(checkpointId, CheckpointStatus.confirmed);
      SecurityModule.logger.info('LiveTrackingCubit: Pickup confirmed successfully');
      
      if (response['type'] == 'RIDE_COMPLETED') {
        SecurityModule.logger.info('LiveTrackingCubit: Ride completed!');
        _handleRideCompletion();
      }
    } else if (response['type'] == 'CHECKPOINT_CONFIRM_ERROR') {
      SecurityModule.logger.error('LiveTrackingCubit: Failed to confirm pickup: ${response['message']}');
      _showError('Failed to confirm pickup: ${response['message']}');
    }
  } catch (e) {
    SecurityModule.logger.error('LiveTrackingCubit: Failed to confirm pickup - $e');
    _showError('Failed to confirm pickup: $e');
  }
}
```

## Expected Server Responses

### Success Response
```dart
{
  'type': 'CHECKPOINT_CONFIRMED',  // or 'RIDE_COMPLETED'
  'message': 'CHECKPOINT_CONFIRMED',
  'data': {
    'confirmed_children': [210, 211],  // Only for child checkpoints
    'checkpointIndex': 1,
    'checkpoint': {
      'type': 'pickup',
      'status': 'done',
      // ... other checkpoint data
    },
    'isRideComplete': false
  }
}
```

### Error Responses
```dart
{
  'type': 'CHECKPOINT_CONFIRM_ERROR',
  'message': 'ERROR: YOU ARE TOO FAR FROM CHECKPOINT! Distance: 150m',
  'data': null
}
```

## Common Error Messages

1. **Distance Error**: `"ERROR: YOU ARE TOO FAR FROM CHECKPOINT! Distance: 150m"`
2. **Missing Data**: `"BAD REQUEST, MISSING ride_group_id!"`
3. **Already Confirmed**: `"ERROR: CHECKPOINT ALREADY CONFIRMED!"`
4. **Not Joined**: `"ERROR: DRIVER NOT JOINED TO RIDE ROOM!"`
5. **Invalid Children**: `"ERROR: MUST SPECIFY CHILDREN BEING PICKED UP/DELIVERED!"`
6. **No Active Ride**: `"NO ACTIVE INSTANCES, CREATE ONE FIRST!"`

## Socket Repository Interface

Make sure your `SocketRepository` has the `emitWithAck` method:

```dart
class SocketRepository {
  Future<Map<String, dynamic>> emitWithAck(String event, Map<String, dynamic> data) async {
    final completer = Completer<Map<String, dynamic>>();
    
    _socket.emitWithAck(event, data, ack: (response) {
      completer.complete(Map<String, dynamic>.from(response));
    });
    
    return completer.future;
  }
}
```

## Key Changes Needed

1. **Replace `_socketRepository.send()`** with **`_socketRepository.emitWithAck()`**
2. **Remove custom `_waitForSocketAck()`** system
3. **Handle proper response types**: `CHECKPOINT_CONFIRMED`, `RIDE_COMPLETED`, `CHECKPOINT_CONFIRM_ERROR`
4. **Add proper error handling** for different error types
