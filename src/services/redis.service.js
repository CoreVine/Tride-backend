const Redis = require('ioredis');
const loggingService = require('./logging.service');

let publisher;
let subscriber;
let redisClient;
let logger;

/**
 * Redis service for pub/sub and caching
 */
const redisService = {
  /**
   * Initialize Redis connections
   */
  init: async () => {
    try {
      logger = loggingService.getLogger();
      
      // Redis connection options
      const redisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        username: process.env.REDIS_USERNAME,
        tls: process.env.REDIS_USE_TLS === 'true' ? {} : undefined,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      };

      // Create Redis clients
      publisher = new Redis(redisOptions);
      subscriber = new Redis(redisOptions);
      redisClient = new Redis(redisOptions);

      // Set up event handlers
      publisher.on('error', (err) => logger.error('Redis Publisher Error:', err));
      subscriber.on('error', (err) => logger.error('Redis Subscriber Error:', err));
      redisClient.on('error', (err) => logger.error('Redis Client Error:', err));

      publisher.on('connect', () => logger.info('Redis Publisher connected'));
      subscriber.on('connect', () => logger.info('Redis Subscriber connected'));
      redisClient.on('connect', () => logger.info('Redis Client connected'));

      logger.info('[REDIS] Redis service initialized');
      return { publisher, subscriber, redisClient };
    } catch (error) {
      logger.error('[REDIS] Error initializing Redis service:', error);
      throw error;
    }
  },

  /**
   * Publish a message to a channel
   * @param {string} channel - Channel name
   * @param {object|string} message - Message to publish
   */
  publish: async (channel, message) => {
    try {
      const messageString = typeof message === 'object' ? JSON.stringify(message) : message;
      await publisher.publish(channel, messageString);
    } catch (error) {
      logger.error(`[REDIS] Error publishing to ${channel}:`, error);
      throw error;
    }
  },

  /**
   * Subscribe to a channel
   * @param {string} channel - Channel name
   * @param {function} callback - Callback function
   */
  subscribe: async (channel, callback) => {
    try {
      await subscriber.subscribe(channel);
      subscriber.on('message', (subscribedChannel, message) => {
        if (subscribedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
          } catch (e) {
            callback(message);
          }
        }
      });
      logger.info(`[REDIS] Subscribed to channel: ${channel}`);
    } catch (error) {
      logger.error(`[REDIS] Error subscribing to ${channel}:`, error);
      throw error;
    }
  },

  /**
   * Unsubscribe from a channel
   * @param {string} channel - Channel name
   */
  unsubscribe: async (channel) => {
    try {
      await subscriber.unsubscribe(channel);
      logger.info(`[REDIS] Unsubscribed from channel: ${channel}`);
    } catch (error) {
      logger.error(`[REDIS] Error unsubscribing from ${channel}:`, error);
      throw error;
    }
  },

  /**
   * Set a key-value pair in Redis
   * @param {string} key - Key
   * @param {string|object} value - Value
   * @param {number} ttl - Time to live in seconds
   */
  set: async (key, value, ttl = null) => {
    try {
      const valueString = typeof value === 'object' ? JSON.stringify(value) : value;
      if (ttl) {
        await redisClient.set(key, valueString, 'EX', ttl);
      } else {
        await redisClient.set(key, valueString);
      }
    } catch (error) {
      logger.error(`[REDIS] Error setting key ${key}:`, error);
      throw error;
    }
  },

  /**
   * Get a value from Redis
   * @param {string} key - Key
   * @returns {Promise<string|object|null>} Value
   */
  get: async (key) => {
    try {
      const value = await redisClient.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    } catch (error) {
      logger.error(`[REDIS] Error getting key ${key}:`, error);
      throw error;
    }
  },

  /**
   * Delete a key from Redis
   * @param {string} key - Key
   */
  delete: async (key) => {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error(`[REDIS] Error deleting key ${key}:`, error);
      throw error;
    }
  },

  /**
   * Store user connection information with support for multiple sockets
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID
   * @param {string} userType - User type (driver/rider/parent)
   */
  storeUserConnection: async (userId, socketId, userType) => {
    try {
      const key = `user:${userId}:sockets`;
      await redisClient.hset(key, socketId, JSON.stringify({
        userType,
        connectedAt: Date.now(),
        lastSeen: Date.now(),
      }));
      // Set TTL for user connection (1 day)
      await redisClient.expire(key, 86400);
      
      // Also store a reverse mapping for quick lookup
      const reverseKey = `socket:${socketId}`;
      await redisService.set(reverseKey, { userId, userType }, 86400);
    } catch (error) {
      logger.error(`[REDIS] Error storing user connection for userId ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Update last seen time for a user's socket connection
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID
   */
  updateUserSocketActivity: async (userId, socketId) => {
    try {
      const key = `user:${userId}:sockets`;
      const socketData = await redisClient.hget(key, socketId);
      
      if (socketData) {
        const parsedData = JSON.parse(socketData);
        parsedData.lastSeen = Date.now();
        
        await redisClient.hset(key, socketId, JSON.stringify(parsedData));
        
        // Refresh TTL for both keys
        await redisClient.expire(key, 86400);
        const reverseKey = `socket:${socketId}`;
        await redisClient.expire(reverseKey, 86400);
      }
    } catch (error) {
      logger.error(`[REDIS] Error updating socket activity for userId ${userId}, socketId ${socketId}:`, error);
      throw error;
    }
  },

  /**
   * Get all socket connections for a user
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} User socket connections
   */
  getUserConnections: async (userId) => {
    try {
      const key = `user:${userId}:sockets`;
      const data = await redisClient.hgetall(key);
      if (!data || Object.keys(data).length === 0) return null;
      
      // Parse the JSON values
      const connections = {};
      for (const [socketId, value] of Object.entries(data)) {
        connections[socketId] = JSON.parse(value);
      }
      return connections;
    } catch (error) {
      logger.error(`[REDIS] Error getting user connections for userId ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Get user connection info (legacy method - returns first connection found)
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} User connection info
   */
  getUserConnection: async (userId) => {
    try {
      const connections = await redisService.getUserConnections(userId);
      if (!connections) return null;
      
      // Return the first connection found
      const socketIds = Object.keys(connections);
      if (socketIds.length === 0) return null;
      
      return {
        socketId: socketIds[0],
        ...connections[socketIds[0]]
      };
    } catch (error) {
      logger.error(`[REDIS] Error getting user connection for userId ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Remove a specific socket connection for a user
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID to remove
   */
  removeUserSocketConnection: async (userId, socketId) => {
    try {
      const key = `user:${userId}:sockets`;
      const reverseKey = `socket:${socketId}`;
      
      // Use Redis pipeline for atomic operations
      const pipeline = redisClient.pipeline();
      pipeline.hdel(key, socketId);
      pipeline.del(reverseKey);
      
      const results = await pipeline.exec();
      
      // Check if user has any remaining connections
      const remainingConnections = await redisClient.hlen(key);
      if (remainingConnections === 0) {
        await redisClient.del(key);
        logger.debug(`[REDIS] Removed empty user socket hash for userId ${userId}`);
      }
      
      logger.debug(`[REDIS] Successfully removed socket ${socketId} for user ${userId}`);
    } catch (error) {
      logger.error(`[REDIS] Error removing socket connection for userId ${userId}, socketId ${socketId}:`, error);
      throw error;
    }
  },

  /**
   * Clean up orphaned socket mappings (utility function)
   * @param {string} socketId - Socket ID to clean up
   */
  cleanupOrphanedSocket: async (socketId) => {
    try {
      const reverseKey = `socket:${socketId}`;
      const data = await redisService.get(reverseKey);
      
      if (data && data.userId) {
        await redisService.removeUserSocketConnection(data.userId, socketId);
        logger.debug(`[REDIS] Cleaned up orphaned socket ${socketId} for user ${data.userId}`);
      } else {
        // Just remove the reverse mapping if no user data found
        await redisClient.del(reverseKey);
        logger.debug(`[REDIS] Removed orphaned reverse mapping for socket ${socketId}`);
      }
    } catch (error) {
      logger.error(`[REDIS] Error cleaning up orphaned socket ${socketId}:`, error);
      throw error;
    }
  },

  /**
   * Remove user connection (all sockets)
   * @param {string} userId - User ID
   */
  removeUserConnection: async (userId) => {
    try {
      const key = `user:${userId}:sockets`;
      
      // Get all socket IDs first to clean up reverse mappings
      const socketData = await redisClient.hgetall(key);
      const socketIds = Object.keys(socketData);
      
      // Remove reverse mappings
      for (const socketId of socketIds) {
        const reverseKey = `socket:${socketId}`;
        await redisClient.del(reverseKey);
      }
      
      // Remove the main key
      await redisClient.del(key);
    } catch (error) {
      logger.error(`[REDIS] Error removing user connection for userId ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Get user ID from socket ID
   * @param {string} socketId - Socket ID
   * @returns {Promise<string|null>} User ID
   */
  getUserIdFromSocket: async (socketId) => {
    try {
      const reverseKey = `socket:${socketId}`;
      const data = await redisService.get(reverseKey);
      return data ? data.userId : null;
    } catch (error) {
      logger.error(`[REDIS] Error getting userId from socketId ${socketId}:`, error);
      throw error;
    }
  },

  /**
   * Store ride participants for broadcasting
   * @param {string} rideId - Ride ID
   * @param {string} driverId - Driver ID
   * @param {string} riderId - Rider ID
   */
  storeRideParticipants: async (rideId, driverId, riderId) => {
    try {
      const key = `ride:${rideId}:participants`;
      await redisClient.sadd(key, driverId, riderId);
      // Set TTL for ride participants (24 hours)
      await redisClient.expire(key, 86400);
    } catch (error) {
      logger.error(`[REDIS] Error storing ride participants for rideId ${rideId}:`, error);
      throw error;
    }
  },

  /**
   * Get ride participants
   * @param {string} rideId - Ride ID
   * @returns {Promise<string[]>} Array of participant user IDs
   */
  getRideParticipants: async (rideId) => {
    try {
      const key = `ride:${rideId}:participants`;
      return await redisClient.smembers(key);
    } catch (error) {
      logger.error(`[REDIS] Error getting ride participants for rideId ${rideId}:`, error);
      throw error;
    }
  },

  /**
   * Remove ride participants
   * @param {string} rideId - Ride ID
   */
  removeRideParticipants: async (rideId) => {
    try {
      const key = `ride:${rideId}:participants`;
      await redisClient.del(key);
    } catch (error) {
      logger.error(`[REDIS] Error removing ride participants for rideId ${rideId}:`, error);
      throw error;
    }
  },

  /**
   * Store driver's last location
   * @param {string} driverId - Driver ID
   * @param {object} location - Location object {lat, lng}
   */
  storeDriverLocation: async (driverId, location) => {
    try {
      const key = `driver:${driverId}:location`;
      await redisClient.set(key, JSON.stringify({
        ...location,
        timestamp: Date.now()
      }));
      // Set TTL for location (5 minutes)
      await redisClient.expire(key, 300);
    } catch (error) {
      logger.error(`[REDIS] Error storing driver location for driverId ${driverId}:`, error);
      throw error;
    }
  },

  /**
   * Get driver's last location
   * @param {string} driverId - Driver ID
   * @returns {Promise<object|null>} Location object
   */
  getDriverLocation: async (driverId) => {
    try {
      const key = `driver:${driverId}:location`;
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`[REDIS] Error getting driver location for driverId ${driverId}:`, error);
      throw error;
    }
  },

  upsertDeviceTokens: async (accountId, deviceTokens) => {
    const key = `account:${accountId}:flutterDeviceTokens`;
    try {
      if (!Array.isArray(deviceTokens) || deviceTokens.length === 0) {
        logger.warn(`[REDIS] No device tokens provided for accountId ${accountId}`);
        return;
      }

      // remove the old tokens
      await redisClient.del(key);

      // add the new tokens
      await redisClient.sadd(key, ...deviceTokens);
    } catch (error) {
      logger.error(`[REDIS] Error setting device token for accountId ${accountId}: ${error.toString()}`);
      throw error;
    }
  },

  getDeviceTokens: async (accountId) => {
    const key = `account:${accountId}:flutterDeviceTokens`;

    try {
      const tokens = await redisClient.smembers(key);
      return tokens || [];
    } catch (error) {
      logger.error(`[REDIS] Error getting device tokens for accountId ${accountId}:`, error);
      throw error;
    }
  },

  removeDeviceTokens: async (accountId, deviceTokens) => {
    const key = `account:${accountId}:flutterDeviceTokens`;
    
    try {
      if (!Array.isArray(deviceTokens) || deviceTokens.length === 0) {
        logger.warn(`[REDIS] No device tokens provided for accountId ${accountId}`);
        return;
      }
      await redisClient.srem(key, ...deviceTokens);
    } catch (error) {
      logger.error(`[REDIS] Error removing device tokens for accountId ${accountId}: ${error}`);
      throw error;
    }
  },

  setLocationUpdates: async (roomId, { lat, lng, ts }) => {
    try {
      await redisClient.set(roomId, JSON.stringify({ lat, lng, ts }));
    } catch (error) {
      logger.error(`[REDIS] Error setting location for room ${roomId}: ${error}`);
      throw error;
    }
  },

  getLatestLocationUpdate: async (roomId) => {
    try {
      const data = await redisClient.get(roomId);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`[REDIS] Error getting latest location for room ${roomId}:`, error);
      throw error;
    }
  },

  getRideOrderForRideInstance: async (rideInstanceId) => {
    try {
      const data = await redisClient.hgetall(`rideInstance:${rideInstanceId}:order`);

      // Parse the JSON values
      if (data && Object.keys(data).length > 0) {
        const parsedOrder = {};
        for (const [index, value] of Object.entries(data)) {
          parsedOrder[index] = JSON.parse(value);
        }
        return parsedOrder;
      }

      return {};
    } catch (error) {
      logger.error(`[REDIS] Error getting ride instance order for room ${rideInstanceId}: ${error}`);
      throw error;
    }
  },

  setRideOrderForRideInstance: async (rideInstanceId, order, endIndex) => {
    try {
      await redisClient.del(`rideInstance:${rideInstanceId}:order`);

      // Prepare field-value pairs for hset
      const fieldValuePairs = [];
      order.forEach((checkpoint, index) => fieldValuePairs.push(index, JSON.stringify(checkpoint)));

      // Set the new values
      if (fieldValuePairs.length > 0) {
        await redisClient.hset(`rideInstance:${rideInstanceId}:order`, ...fieldValuePairs);
      }
    } catch (error) {
      logger.error(`[REDIS] Error setting ride instance order for room ${rideInstanceId}: ${error}`);
      throw error;
    }
  },

  deleteRideOrderForRideInstance: async (rideInstanceId) => {
    try {
      await redisClient.del(`rideInstance:${rideInstanceId}:order`);
    } catch (error) {
      logger.error(`[REDIS] Error deleting ride instance order for room ${rideInstanceId}: ${error}`);
      throw error;
    }
  },

  updateRideInstanceCheckpoint: async (rideInstanceId, checkpointIndex, newCheckpoint) => {
    try {
      await redisClient.hset(`rideInstance:${rideInstanceId}:order`, checkpointIndex, JSON.stringify(newCheckpoint));
    } catch (error) {
      logger.error(`[REDIS] Error updating ride instance checkpoint for room ${rideInstanceId}: ${error}`);
      throw error;
    }
  },

  flushRideInstance: async (rideInstanceId, rideRoomId) => {
    try {
      // Delete ride order data
      await redisClient.del(`rideInstance:${rideInstanceId}:order`);
      
      // Delete location updates for the ride room
      if (rideRoomId) {
        await redisClient.del(rideRoomId);
      }
      
      logger.debug(`[REDIS] Successfully flushed data for ride instance ${rideInstanceId}`);
    } catch (error) {
      logger.error(`[REDIS] Error flushing ride instance data for ${rideInstanceId}: ${error}`);
      throw error;
    }
  },

  /**
   * Checks if Redis client is connected
   * @returns {boolean} Whether Redis is connected
   */
  isConnected: () => {
    try {
      return redisClient && redisClient.status === 'ready';
    } catch (error) {
      logger.error('[REDIS] Error checking connection status:', error);
      return false;
    }
  },

  // Clean up connections
  disconnect: async () => {
    try {
      if (publisher) await publisher.quit();
      if (subscriber) await subscriber.quit();
      if (redisClient) await redisClient.quit();
      logger.info('[REDIS] Redis connections closed');
    } catch (error) {
      logger.error('[REDIS] Error disconnecting Redis:', error);
    }
  }
};

module.exports = redisService;
