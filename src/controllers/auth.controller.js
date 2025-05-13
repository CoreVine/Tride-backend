import JwtService from '../services/jwt.service';
const bcrypt = require('bcryptjs');
const { BadRequestError, UnauthorizedError, NotFoundError, BadTokenError } = require('../utils/errors/types/Api.error');
const loggingService = require('../services/logging.service');
const emailService = require('../services/email.service');
const VerificationCodeRepository = require('../data-access/verificationCodes');

const UserRepository = require('../data-access/users');

const logger = loggingService.getLogger();

// Calculate code expiration for email verification
const getEmailVerificationExpiration = () => {
  const expiresAt = new Date();
  const minutes = parseFloat(process.env.EMAIL_VERIFICATION_EXP_MINS) || 30;
  expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
  return expiresAt;
};

const authController = {
  register: async (req, res, next) => {
    try {
      logger.info('Registration attempt');
      
      // Validation is already handled by the validate middleware in routes
      const { email, username, password } = req.body;
      
      const userExists = await UserRepository.findOneByEmailOrUsername({ email, username });
      
      if (userExists) {
        logger.warn('User registration failed - user already exists', { email, username });
        throw new BadRequestError('User with this email or username already exists');
      }
      
      const password_hash = await bcrypt.hash(password, 12);
      
      // Check if email verification is required
      const emailVerificationRequired = process.env.EMAIL_VERIFICATION_REQUIRED === 'true';
      
      const user = await UserRepository.create({
        ...req.body,
        password_hash,
        acc_type: 'user', // Ensure only user type is created
        email_verified: !emailVerificationRequired // Set to true if verification not required
      });
      
      logger.info('User registered successfully', { user_id: user.user_id, username });
      
      // Remove sensitive data
      user.password_hash = undefined;
      
      // If email verification is required, send verification code
      if (emailVerificationRequired) {
        // Generate a verification code
        const code = emailService.generateVerificationCode();
        const expiresAt = getEmailVerificationExpiration();
        
        // Save the verification code
        await VerificationCodeRepository.create({
          email,
          code,
          expires_at: expiresAt,
          account_type: 'user',
          type: 'email_verification',
          verified: false,
          attempt_count: 0
        });
        
        // Send email with verification code
        await emailService.sendAccountVerificationCode(email, {
          name: user.name || username,
          verificationCode: code,
          expiryMinutes: process.env.EMAIL_VERIFICATION_EXP_MINS || 30
        });
        
        logger.info(`Email verification code sent to ${email}`);
        
        return res.success('Registration successful. Please verify your email address.', {
          user,
          requiresVerification: true
        });
      }
      
      // If no email verification required, proceed with normal login flow
      const jwtResponse = JwtService.jwtSign(user.user_id);
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
        
        return res.success('User registered successfully', { user, token, refreshToken: jwtResponse.refreshToken });
      }
      
      return res.success('User registered successfully', { user, token });
    } catch (error) {
      logger.error('Registration error', { error: error.message, stack: error.stack });
      next(error);
    }
  },
  
  login: async (req, res, next) => {
    try {
      const { email } = req.body;
      logger.info(`Login attempt for: ${email}`);
      
      const { password } = req.body;
      
      const user = await UserRepository.findOneByEmail(email);
      
      if (!user) {
        logger.warn(`Login failed - user not found: ${email}`);
        throw new BadRequestError('User not found');
      }

      if(process.env.EMAIL_VERIFICATION_REQUIRED && !user.email_verified) {
        logger.warn(`Login failed - email not verified: ${email}`);
        throw new BadRequestError('Email not verified');
      }
      
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      
      if (!passwordMatch) {
        logger.warn(`Login failed - invalid password for user: ${email}`);
        throw new UnauthorizedError();
      }
      
      // Remove sensitive data
      user.password_hash = undefined;
      
      const jwtResponse = JwtService.jwtSign(user.user_id);
      const { token } = jwtResponse;
      
      logger.info(`Login successful for user: ${email}`, { user_id: user.user_id });
      
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
        
        return res.success('Login successful', { user, token, refreshToken: jwtResponse.refreshToken });
      }
      
      return res.success('Login successful', { user, token });
    } catch (error) {
      logger.error('Login error', { error: error.message, stack: error.stack });
      next(error);
    }
  },
  
  me: async (req, res, next) => {
    try {
      logger.info('Profile retrieval attempt', { userId: req.userId });
      
      const user = await UserRepository.findByIdExcludeProps(req.userId, ['password_hash']);
      
      if (user) {
        logger.info(`Profile retrieved`, { user_id: user.user_id });
        return res.success('Profile retrieved successfully', { user });
      }
      
      logger.warn('Profile not found', { userId: req.userId });
      throw new NotFoundError('Profile not found');
    } catch (error) {
      logger.error('Profile retrieval error', { error: error.message, stack: error.stack });
      next(error);
    }
  },

  refreshToken: (req, res, next) => {
    try {
      console.log(process.env.SERVER_JWT_REFRESH_ENABLED);
      
      if (process.env.SERVER_JWT_REFRESH_ENABLED !== "true") {
        throw new BadRequestError('Refresh token functionality is not enabled');
      }
      
      let refreshToken = req.cookies.refresh_token;
      
      if (!refreshToken && req.body.refresh_token) {
        refreshToken = req.body.refresh_token;
      }

      if (!refreshToken)
        throw new BadRequestError('Refresh token is required!');

      const token = JwtService.jwtRefreshToken(refreshToken);

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

      res.success('Refresh token exchanged successfully', { token });
    } catch (error) {
      logger.error('Refresh token error', { error: error.message, stack: error.stack });
      next(new BadTokenError('Bad refresh token'));
    }
  },
  
  logout: (req, res, next) => {
    try {
      // Try to get token but don't throw if not found
      let token;
      try {
        token = JwtService.jwtGetToken(req);
        // Blacklist the token only if it exists
        if (token) {
          JwtService.jwtBlacklistToken(token);
        }
      } catch (error) {
        // Log the error but continue with logout process
        logger.warn('No valid token found during logout', { error: error.message });
      }

      // Always clear cookies regardless of token presence
      res.clearCookie('token');
      if (process.env.SERVER_JWT_REFRESH_ENABLED === "true") {
        res.clearCookie('refresh_token');
      }

      res.success('Logged out successfully!');
    } catch (error) {
      logger.error('Logout error', { error: error.message });
      next(error);
    }
  }
};

module.exports = authController;
