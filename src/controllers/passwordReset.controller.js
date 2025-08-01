const AccountRepository = require('../data-access/accounts');
const VerificationCodeRepository = require('../data-access/verificationCodes');
const emailService = require('../services/email.service');
const loggingService = require('../services/logging.service');
const bcrypt = require('bcryptjs');
const { 
  NotFoundError, 
  VerificationCodeExpiredError,
  VerificationCodeInvalidError,
  InvalidResetTokenError,
  ResetTokenUsedError,
  BadRequestError,
  TooManyAttemptsError
} = require('../utils/errors');

const logger = loggingService.getLogger();

// Calculate code expiration (5 minutes from now)
const getCodeExpiration = () => {
  const expiresAt = new Date();
  const minutes = parseFloat(process.env.RESET_PW_VERIFICATION_EXP_MINS) || 5;
  expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
  return expiresAt;
};

// Maximum number of verification attempts
const MAX_VERIFICATION_ATTEMPTS = 5;

const passwordResetController = {
  /**
   * Request a password reset verification code
   * @route POST /auth/password/request
   */
  requestVerificationCode: async (req, res, next) => {
    try {
      const { email } = req.body;
      
      // Run cleanup of expired and used tokens to keep the database clean
      await VerificationCodeRepository.cleanupTokens(email);
      
      // Check if user exists
      const accountData = await AccountRepository.findOneByEmail(email);
      
      // SECURITY: Always return success response even if user not found
      // This prevents user enumeration attacks
      if (!accountData) {
        logger.debug(`Password reset requested for non-existent account: ${email}`);
        return res.success('If your email is registered, you will receive a password reset code', {
          email,
          expiresAt: getCodeExpiration()
        });
      }

      // Check if account was created with email (not social auth)
      if (accountData.auth_method !== 'email') {
        logger.warn('Password reset attempted for social auth account', { email, auth_method: accountData.auth_method });
        return res.error('Password reset is only available for accounts created with email login. Please log in using your social provider.', 400);
      }

      // Delete any existing verification codes for this email
      await VerificationCodeRepository.deleteByEmailAndType(email, 'password_reset');
      
      // Generate a new verification code
      const code = emailService.generateVerificationCode();
      const expiresAt = getCodeExpiration();
      
      // Save the verification code
      await VerificationCodeRepository.create({
        email,
        code,
        expires_at: expiresAt,
        account_type: accountData.account_type,
        type: 'password_reset',
        verified: false,
        attempt_count: 0
      });
      
      // Send email with verification code
      await emailService.sendPasswordResetCode(email, {
        name: accountData.name || email.split('@')[0],
        verificationCode: code,
        expiryMinutes: process.env.RESET_PW_VERIFICATION_EXP_MINS || 5
      });
      
      logger.debug(`Password reset verification code sent to ${email}`);
      
      res.success('If your email is registered, you will receive a password reset code', {
        email,
        expiresAt
      });
    } catch (error) {
      logger.error('Error in requestVerificationCode', { error: error.message });
      next(error);
    }
  },
  
  /**
   * Resend a verification code
   * @route POST /auth/password/resend
   */
  resendVerificationCode: async (req, res, next) => {
    // Just redirect to the request endpoint for simplicity
    return passwordResetController.requestVerificationCode(req, res, next);
  },
  
  /**
   * Verify a password reset code
   * @route POST /auth/password/verify
   */
  verifyCode: async (req, res, next) => {
    try {
      const { email, code } = req.body;

      // Find the verification code
      const verificationCode = await VerificationCodeRepository.findByEmailAndType(email, 'password_reset');
      
      if (!verificationCode) {
        logger.warn(`Verification attempt for non-existent code: ${email}`);
        throw new VerificationCodeInvalidError();
      }
      
      // Check attempt count
      if (verificationCode.attempt_count >= MAX_VERIFICATION_ATTEMPTS) {
        logger.warn(`Too many verification attempts for ${email}`);
        throw new TooManyAttemptsError('Too many verification attempts. Please request a new code.');
      }
      
      // Always increment attempt counter
      await VerificationCodeRepository.incrementAttempt(email, 'password_reset');
      
      // Validate code
      if (verificationCode.code !== code) {
        logger.warn(`Invalid verification code attempt for ${email}`);
        throw new VerificationCodeInvalidError();
      }
      
      // Check expiration
      if (new Date() > verificationCode.expires_at) {
        logger.warn(`Expired verification code used for ${email}`);
        throw new VerificationCodeExpiredError();
      }

      // Check if account exists
      const account = await AccountRepository.findOneByEmail(email);
      
      if (!account) {
        throw new NotFoundError('Account not found');
      }
      
      // Check if account was created with email (not social auth)
      if (account.auth_method !== 'email') {
        logger.warn('Password verification attempted for social auth account', { email, auth_method: account.auth_method });
        throw new BadRequestError('Password reset is only available for accounts created with email login');
      }
      
      // Mark code as verified
      await VerificationCodeRepository.markAsVerified(verificationCode.id);
      
      // Generate reset token
      const resetToken = await VerificationCodeRepository.generateResetToken(verificationCode.id);
      
      logger.info(`Password reset code verified for ${email}`);
      
      res.success('Verification code validated successfully', {
        email,
        verified: true,
        expiresAt: verificationCode.expires_at,
        resetToken // Send token directly in response - secure for both web and mobile
      });
    } catch (error) {
      logger.error('Error in verifyCode', { error: error.message });
      next(error);
    }
  },
  
  /**
   * Reset password after verification
   * @route POST /auth/password/reset
   */
  resetPassword: async (req, res, next) => {
    try {
      const { email, password, resetToken } = req.body;
      
      // Validate the reset token
      const verifiedCode = await VerificationCodeRepository.findByResetToken(email, resetToken);
      
      if (!verifiedCode) {
        logger.warn(`Invalid reset token used for ${email}`);
        throw new InvalidResetTokenError();
      }
      
      if (verifiedCode.token_used) {
        logger.warn(`Used reset token attempted for ${email}`);
        throw new ResetTokenUsedError();
      }
      
      // Update user password
      const password_hash = await bcrypt.hash(password, 12);
      
      const account = await AccountRepository.findOneByEmail(email);
      if (!account) {
        throw new NotFoundError('Account not found');
      }
      
      // Check if account was created with email (not social auth)
      if (account.auth_method !== 'email') {
        logger.warn('Password reset attempted for social auth account', { email, auth_method: account.auth_method });
        throw new BadRequestError('Password reset is only available for accounts created with email login');
      }

      await AccountRepository.update(account.id, { password: password_hash });
      
      // Mark token as used and immediately delete it
      await VerificationCodeRepository.markUsedAndDelete(verifiedCode.id);
      
      logger.info(`Password successfully reset for ${email}`);
      
      return res.success('Password reset successfully');
    } catch (error) {
      logger.error('Error in resetPassword', { error: error.message });
      next(error);
    }
  }
};

module.exports = passwordResetController;
