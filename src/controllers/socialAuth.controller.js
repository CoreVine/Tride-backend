const JwtService = require('../services/jwt.service');
const googleAuthService = require('../services/googleAuth.service');
const facebookAuthService = require('../services/facebookAuth.service');
const AccountRepository = require('../data-access/accounts');
const ParentRepository = require('../data-access/parent');
const DriverRepository = require('../data-access/driver');
const { BadRequestError, UnauthorizedError } = require('../utils/errors/types/Api.error');
const loggingService = require('../services/logging.service');

const logger = loggingService.getLogger();

const socialAuthController = {
  /**
   * Handle Google authentication
   */
  googleAuth: async (req, res, next) => {
    try {
      const { idToken, account_type } = req.body;
      
      if (!idToken) {
        throw new BadRequestError('ID token is required');
      }
      
      // Verify the Google ID token
      const userData = await googleAuthService.verifyIdToken(idToken);
      
      // Check if user exists
      let account = await AccountRepository.findOneByEmail(userData.email);
      
      if (account && (account.auth_method !== 'google' || account.account_type !== account_type)) {
        throw new UnauthorizedError('Invalid authentication');
      } else if (!account) {
        // Create new account
        account = await AccountRepository.create({
          email: userData.email,
          password: JwtService.generateRandomPassword(), // Random password for social accounts
          auth_method: 'google',
          account_type: account_type,
          is_verified: userData.isVerified
        });
        
        logger.info('New account created from Google login', {
          id: account.id,
          email: account.email
        });
      }
      
      // Check for existing profile based on account type
      let profileData = {};
      let profileComplete = false;
      let accountTypeId = null;
      
      if (account_type === 'parent') {
        const parent = await ParentRepository.findByAccountId(account.id);
        if (parent) {
          profileData.parent = parent;
          profileComplete = true;
          accountTypeId = parent.id;
        }
      } else if (account_type === 'driver') {
        const driver = await DriverRepository.findByAccountIdWithPapers(account.id);
        if (driver) {
          profileData.driver = driver;
          profileComplete = true;
          accountTypeId = driver.id;
          
          if (driver.papers) {
            profileData.papersComplete = true;
          } else {
            profileData.papersComplete = false;
          }
        }
      }
      
      // Generate JWT token
      const jwtResponse = JwtService.jwtSign(account.id, {
        accountType: account_type,
        profileComplete,
        accountTypeId
      });
      
      const { token } = jwtResponse;
      
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      };
      
      if (process.env.SERVER_JWT_USE_EXPIRY === "true") {
        cookieOptions.maxAge = Number(process.env.SERVER_JWT_TIMEOUT);
      }
      
      res.cookie('token', token, cookieOptions);
      
      if (jwtResponse.refreshToken) {
        res.cookie('refresh_token', jwtResponse.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: Number(process.env.SERVER_JWT_REFRESH_MAX_AGE),
          sameSite: 'strict',
          path: '/'
        });
        
        return res.success('Google authentication successful', {
          account: {
            id: account.id,
            email: account.email,
            is_verified: account.is_verified,
            profileComplete,
            accountType: account_type,
            ...profileData
          },
          token,
          refreshToken: jwtResponse.refreshToken
        });
      }
      
      return res.success('Google authentication successful', {
        account: {
          id: account.id,
          email: account.email,
          is_verified: account.is_verified,
          profileComplete,
          accountType: account_type,
          ...profileData
        },
        token
      });
    } catch (error) {
      logger.error('Google authentication error', { error: error.message, stack: error.stack });
      next(error);
    }
  },
  
  /**
   * Handle Facebook authentication
   */
  facebookAuth: async (req, res, next) => {
    try {
      const { accessToken, account_type } = req.body;
      
      if (!accessToken) {
        throw new BadRequestError('Access token is required');
      }
      
      // Verify the Facebook access token
      const userData = await facebookAuthService.verifyAccessToken(accessToken);
      
      // Check if user exists
      let account = await AccountRepository.findOneByEmail(userData.email);
      
      if (account && (account.auth_method !== 'facebook' || account.account_type !== account_type)) {
        throw new UnauthorizedError('Invalid authentication');
      } else if(!account) {
        // Create new account
        account = await AccountRepository.create({
          email: userData.email,
          password: JwtService.generateRandomPassword(), // Random password for social accounts
          auth_method: 'facebook',
          account_type,
          is_verified: userData.isVerified
        });
        
        logger.info('New account created from Facebook login', {
          id: account.id,
          email: account.email
        });
      }
      
      // Check for existing profile based on account type
      let profileData = {};
      let profileComplete = false;
      let accountTypeId = null;
      
      if (account_type === 'parent') {
        const parent = await ParentRepository.findByAccountId(account.id);
        if (parent) {
          profileData.parent = parent;
          profileComplete = true;
          accountTypeId = parent.id;
        }
      } else if (account_type === 'driver') {
        const driver = await DriverRepository.findByAccountIdWithPapers(account.id);
        if (driver) {
          profileData.driver = driver;
          profileComplete = true;
          accountTypeId = driver.id;
          
          if (driver.papers) {
            profileData.papersComplete = true;
          } else {
            profileData.papersComplete = false;
          }
        }
      }
      
      // Generate JWT token
      const jwtResponse = JwtService.jwtSign(account.id, {
        accountType: account_type,
        profileComplete,
        accountTypeId
      });
      
      const { token } = jwtResponse;
      
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      };
      
      if (process.env.SERVER_JWT_USE_EXPIRY === "true") {
        cookieOptions.maxAge = Number(process.env.SERVER_JWT_TIMEOUT);
      }
      
      res.cookie('token', token, cookieOptions);
      
      if (jwtResponse.refreshToken) {
        res.cookie('refresh_token', jwtResponse.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: Number(process.env.SERVER_JWT_REFRESH_MAX_AGE),
          sameSite: 'strict',
          path: '/'
        });
        
        return res.success('Facebook authentication successful', {
          account: {
            id: account.id,
            email: account.email,
            is_verified: account.is_verified,
            profileComplete,
            accountType: account_type,
            ...profileData
          },
          token,
          refreshToken: jwtResponse.refreshToken
        });
      }
      
      return res.success('Facebook authentication successful', {
        account: {
          id: account.id,
          email: account.email,
          is_verified: account.is_verified,
          profileComplete,
          accountType: account_type,
          ...profileData
        },
        token
      });
    } catch (error) {
      logger.error('Facebook authentication error', { error: error.message, stack: error.stack });
      next(error);
    }
  }
};

module.exports = socialAuthController;
