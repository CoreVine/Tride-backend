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
   * Store user connection information
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID
   * @param {string} userType - User type (driver/rider)
   */
  storeUserConnection: async (userId, socketId, userType) => {
    try {
      const key = `user:${userId}`;
      await redisClient.hset(key, {
        socketId,
        userType,
        lastSeen: Date.now(),
      });
      // Set TTL for user connection (1 day)
      await redisClient.expire(key, 86400);
    } catch (error) {
      logger.error(`[REDIS] Error storing user connection for userId ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Get user connection info
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} User connection info
   */
  getUserConnection: async (userId) => {
    try {
      const key = `user:${userId}`;
      const data = await redisClient.hgetall(key);
      return data || null;
    } catch (error) {
      logger.error(`[REDIS] Error getting user connection for userId ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Remove user connection
   * @param {string} userId - User ID
   */
  removeUserConnection: async (userId) => {
    try {
      const key = `user:${userId}`;
      await redisClient.del(key);
    } catch (error) {
      logger.error(`[REDIS] Error removing user connection for userId ${userId}:`, error);
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
