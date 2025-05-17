const axios = require('axios');
const loggingService = require('./logging.service');
const { UnauthorizedError } = require('../utils/errors/types/Api.error');

const logger = loggingService.getLogger();

/**
 * Facebook authentication service for verifying access tokens
 */
const facebookAuthService = {
  /**
   * Verify a Facebook access token and extract user information
   * 
   * @param {string} accessToken - The access token received from client
   * @returns {Promise<Object>} User information extracted from the token
   * @throws {UnauthorizedError} If token verification fails
   */
  async verifyAccessToken(accessToken) {
    try {
      logger.info('Verifying Facebook access token');
      
      // First verify the token
      const appAccessTokenResponse = await axios.get(
        `https://graph.facebook.com/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&grant_type=client_credentials`
      );
      
      const appAccessToken = appAccessTokenResponse.data.access_token;
      
      // Validate the user access token
      const validateResponse = await axios.get(
        `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appAccessToken}`
      );
      
      const { data } = validateResponse;
      
      if (!data.data.is_valid) {
        throw new UnauthorizedError('Invalid Facebook token');
      }
      
      // Get user info
      const userInfoResponse = await axios.get(
        `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture&access_token=${accessToken}`
      );
      
      const userInfo = userInfoResponse.data;
      
      // Extract user information
      const userData = {
        email: userInfo.email,
        firstName: userInfo.first_name || '',
        lastName: userInfo.last_name || '',
        isVerified: true,
        providerId: userInfo.id,
        profilePicture: userInfo.picture?.data?.url,
        authMethod: 'facebook'
      };
      
      logger.info('Facebook token verified successfully', { email: userData.email });
      return userData;
    } catch (error) {
      logger.error('Facebook token verification failed', { 
        error: error.message,
        stack: error.stack 
      });
      throw new UnauthorizedError('Invalid Facebook token');
    }
  }
};

module.exports = facebookAuthService;
