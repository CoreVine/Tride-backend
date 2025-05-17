const { OAuth2Client } = require('google-auth-library');
const loggingService = require('./logging.service');
const { UnauthorizedError } = require('../utils/errors/types/Api.error');

const logger = loggingService.getLogger();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Google authentication service for verifying ID tokens
 */
const googleAuthService = {
  /**
   * Verify a Google ID token and extract user information
   * 
   * @param {string} idToken - The ID token received from client
   * @returns {Promise<Object>} User information extracted from the token
   * @throws {UnauthorizedError} If token verification fails
   */
  async verifyIdToken(idToken) {
    try {
      logger.info('Verifying Google ID token');
      
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      
      // Extract user information from payload
      const userData = {
        email: payload.email,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        isVerified: payload.email_verified,
        providerId: payload.sub,
        profilePicture: payload.picture,
        authMethod: 'google'
      };
      
      logger.info('Google ID token verified successfully', { email: userData.email });
      return userData;
    } catch (error) {
      logger.error('Google token verification failed', { error: error.message });
      throw new UnauthorizedError('Invalid Google token');
    }
  }
};

module.exports = googleAuthService;
