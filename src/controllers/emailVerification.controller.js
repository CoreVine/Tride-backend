const AccountRepository = require('../data-access/accounts');
const VerificationCodeRepository = require('../data-access/verificationCodes');
const emailService = require('../services/email.service');
const loggingService = require('../services/logging.service');
const { 
  NotFoundError, 
  VerificationCodeExpiredError,
  VerificationCodeInvalidError,
  BadRequestError,
  TooManyAttemptsError
} = require('../utils/errors');

const logger = loggingService.getLogger();

// Calculate code expiration based on .env configuration
const getCodeExpiration = () => {
  const expiresAt = new Date();
  const minutes = parseFloat(process.env.EMAIL_VERIFICATION_EXP_MINS) || 30;
  expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
  return expiresAt;
};

// Maximum number of verification attempts
const MAX_VERIFICATION_ATTEMPTS = 5;

const emailVerificationController = {
  /**
   * Resend email verification code
   * @route POST /auth/email/verify/resend
   */
  resendVerificationCode: async (req, res, next) => {
    try {
      const { email } = req.body;
      
      // Run cleanup of expired codes
      await VerificationCodeRepository.cleanupTokens(email);
      
      // Check if user exists
      const accountData = await AccountRepository.findOneByEmail(email);
      
      if (!accountData) {
        logger.warn(`Email verification requested for non-existent account: ${email}`);
        throw new NotFoundError('Account not found');
      }
      
      // Check if email is already verified
      if (accountData.is_verified) {
        logger.info(`Email verification requested for already verified email: ${email}`);
        return res.success('Your email is already verified');
      }
      
      // Delete any existing verification codes for this email
      await VerificationCodeRepository.deleteByEmailAndType(email, 'email_verification');
      
      // Generate a new verification code
      const code = emailService.generateVerificationCode();
      const expiresAt = getCodeExpiration();
      
      // Save the verification code
      await VerificationCodeRepository.create({
        email,
        code,
        expires_at: expiresAt,
        account_type: 'user',
        type: 'email_verification', // Use different type for email verification
        verified: false,
        attempt_count: 0
      });
      
      // Send email with verification code
      await emailService.sendAccountVerificationCode(email, {
        name: accountData.name || email.split('@')[0],
        verificationCode: code,
        expiryMinutes: process.env.EMAIL_VERIFICATION_EXP_MINS || 30
      });
      
      logger.info(`Email verification code sent to ${email}`);
      
      res.success('Verification code has been sent to your email', {
        email,
        expiresAt
      });
    } catch (error) {
      logger.error('Error in resendVerificationCode', { error: error.message });
      next(error);
    }
  },
  
  /**
   * Verify email with verification code
   * @route POST /auth/email/verify
   */
  verifyEmail: async (req, res, next) => {
    try {
      const { email, code } = req.body;

      // Find the verification code
      const verificationCode = await VerificationCodeRepository.findByEmailAndType(email, 'email_verification');
      
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
      await VerificationCodeRepository.incrementAttempt(email, 'email_verification');
      
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
      
      // Update user's email_verified status
      const account = await AccountRepository.findOneByEmail(email);
      
      if (!account) {
        throw new NotFoundError('Account not found');
      }
      
      await AccountRepository.update(account.id, { is_verified: true });
      
      // Delete the verification code as it's no longer needed
      await VerificationCodeRepository.deleteByEmailAndType(email, 'email_verification');
      
      logger.info(`Email successfully verified for ${email}`);
      
      res.success('Email verified successfully', {
        email,
        verified: true
      });
    } catch (error) {
      logger.error('Error in verifyEmail', { error: error.message });
      next(error);
    }
  }
};

module.exports = emailVerificationController;
