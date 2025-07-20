const loggingService = require('./logging.service');
const firebase = require('firebase-admin');
const firebaseServiceKey = require('../config/keys/firebase-service-account-key.json');
const { InternalServerError } = require('../utils/errors/types/Api.error');
const { _stringifyData } = require('../utils/parsers/json');
const redisService = require('./redis.service');
const Notification = require('../mongo-model/Notification');
const logger = loggingService.getLogger();
const AVAILABLE_TOPICS = ['token', 'topic', 'tokens'];

class FireBaseService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize Firebase Admin SDK
   */
  async init() {
    try {
      if (!this.initialized) {
        firebase.initializeApp({
          credential: firebase.credential.cert(firebaseServiceKey),
        });
        this.initialized = true;
        this.notification = firebase.messaging();
        logger.info('[FIREBASE] Firebase services initialized successfully');
      }

      return this;
    } catch (error) {
      logger.error('[FIREBASE] Failed to initialize Firebase services', error);
      throw error;
    }
  }

  /**
   * Send a notification to a device or topic
   * @param {Object} message - The FCM message payload
   * @param {string} message.type - Must be 'token', 'tokens', or 'topic'
   * @param {string} message.target - Device token or topic name
   * @param {string} message.title - Notification title
   * @param {string} message.body - Notification body
   * @param {Object} message.data - Additional data payload
   * @returns {Promise<Object>}
   */
  async sendNotification({ type, target, title, body, data = {} }) {
    if (!AVAILABLE_TOPICS.includes(type)) {
      throw new InternalServerError(`[FIREBASE] Invalid type: ${type}. Must be 'token' or 'topic'.`);
    }

    if (!target || !title || !body) {
      throw new InternalServerError('[FIREBASE] Missing required parameters: target, title, or body.');
    }

    const message = {
      notification: {
        title,
        body,
      },
      [type]: target,
      data: _stringifyData(data)
    };

    // store 
    await Notification.create({
      accountId: target,
      type,
      title,
      message: body,
      relatedEntityType: data.relatedEntityType || null,
      relatedEntityId: data.relatedEntityId || null,
      metadata: data
    });

    try {
      let response;
      if (type === 'tokens') {
        // get tokens from target
        const accountId = target;

        // get the device tokens from the redis cache
        const tokens = await redisService.getDeviceTokens(accountId);

        message.tokens = tokens;

        response = await this.notification.sendEachForMulticast(message);

        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (resp.success)
            return;

          // get the token that failed, and remove it from database entirely
          failedTokens.push(tokens[idx]);
        });
        redisService.removeDeviceTokens(accountId, failedTokens);
      } else {
        response = await this.notification.send(message);
      }
      logger.info('[FIREBASE] Notification sent successfully', { response });
      return response;
    } catch (error) {
      logger.error('[FIREBASE] Failed to send notification', error);
      throw error;
    }
  }
}

module.exports = new FireBaseService();
