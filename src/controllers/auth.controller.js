const JwtService = require("../services/jwt.service");
const {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  BadTokenError,
} = require("../utils/errors/types/Api.error");
const loggingService = require("../services/logging.service");
const emailService = require("../services/email.service");
const VerificationCodeRepository = require("../data-access/verificationCodes");

// Import repositories
const AccountRepository = require("../data-access/accounts");
const ParentRepository = require("../data-access/parent");
const DriverRepository = require("../data-access/driver");
const AccountsFirebaseTokens = require("../mongo-model/AccountsFirebaseTokens");
const redisService = require("../services/redis.service");

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
      logger.info("Registration attempt");

      // Validation is already handled by the validate middleware in routes
      const { email, password, account_type } = req.body;

      const accountExists = await AccountRepository.findOneByEmail(email);

      if (accountExists) {
        logger.warn("Account registration failed - email already exists", {
          email,
        });
        throw new BadRequestError("Account with this email already exists");
      }

      // Check if email verification is required
      const emailVerificationRequired =
        process.env.EMAIL_VERIFICATION_REQUIRED === "true";

      // Set account_type
      const userAccountType = account_type;

      const account = await AccountRepository.create({
        email,
        password, // Account model will hash this through hooks
        auth_method: "email",
        account_type: userAccountType, // Store the account type in the database
        is_verified: !emailVerificationRequired, // Set to true if verification not required
      });

      logger.info("Account registered successfully", {
        account_id: account.id,
        email,
        account_type: userAccountType,
      });

      // Store account type preference in session/token claims
      req.session = req.session || {};
      req.session.preferredAccountType = userAccountType;

      // If email verification is required, send verification code
      if (emailVerificationRequired) {
        // Generate a verification code
        // const code = emailService.generateVerificationCode();
        // DEBUG: Use a fixed code for testing purposes
        const code = "111111"; // Replace with emailService.generateVerificationCode() in
        const expiresAt = getEmailVerificationExpiration();

        // Save the verification code
        await VerificationCodeRepository.create({
          email,
          code,
          expires_at: expiresAt,
          account_type: userAccountType, // Use the same account type
          type: "email_verification",
          verified: false,
          attempt_count: 0,
        });

        // Send email with verification code
        await emailService.sendAccountVerificationCode(email, {
          name: email.split("@")[0], // Use part of the email as name
          verificationCode: code,
          expiryMinutes: process.env.EMAIL_VERIFICATION_EXP_MINS || 30,
        });

        logger.info(`Email verification code sent to ${email}`);

        if (req.fromAdminCreation) {
          req.account = {
            id: account.id
          };
          return next();
        }

        return res.success(
          "Registration successful. Please verify your email address.",
          {
            account: {
              id: account.id,
              email: account.email,
              is_verified: account.is_verified,
            },
            requiresVerification: true,
          }
        );
      }

      // If no email verification required, proceed with normal login flow
      const jwtResponse = JwtService.jwtSign(account.id, {
        preferredAccountType: req.body.account_type,
      });
      const { token } = jwtResponse;

      if (jwtResponse.refreshToken) {
        return res.success("Account registered successfully", {
          account: {
            id: account.id,
            email: account.email,
            is_verified: account.is_verified,
          },
          token,
          refreshToken: jwtResponse.refreshToken,
        });
      }

      return res.success("Account registered successfully", {
        account: {
          id: account.id,
          email: account.email,
          is_verified: account.is_verified,
        },
        token,
      });
    } catch (error) {
      logger.error("Registration error", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },

  registerDeviceToken: async (req, res, next) => {
    const { userId } = req;
    const { device_token } = req.body;
    
    try {
      const account = await AccountRepository.findById(userId);
      if (!account) {
        logger.warn("Device token registration failed - account not found");
        throw new NotFoundError("Account not found");
      }
  
      // TODO: Refactor all mongoose models into data-access layer
      // register device token to get notifications
      let tokensDoc = await AccountsFirebaseTokens.findOne({
        account_id: account.id,
      });
  
      if (!tokensDoc) {
        tokensDoc = await AccountsFirebaseTokens.create({
          account_id: account.id,
          tokens: [],
        });
      }
  
      // Add device token if not already present
      if (!tokensDoc.tokens.includes(device_token)) {
        if (tokensDoc.tokens.length == 20) {
          tokensDoc.tokens.shift();
        }
  
        tokensDoc.tokens = [...tokensDoc.tokens, device_token];
        await tokensDoc.save();
      }
  
      // Store device token in Redis for quick access
      await redisService.upsertDeviceTokens(account.id, tokensDoc.tokens);  

      return res.success("Device token registered successfully");
    } catch (error) {
      logger.error("Device token registration error", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },

  removeDeviceToken: async (req, res, next) => {
    try {
      // destroy the device token for notifications (if provided)
      const { device_token } = req.body;

      if (device_token && req.userId) {
        await AccountsFirebaseTokens.updateOne(
          { account_id: req.userId },
          { $pull: { tokens: device_token } }
        );

        await redisService.removeDeviceTokens(req.userId, device_token);
      }

      return res.success("Device token removed successfully");
    } catch (error) {
      logger.error("Error removing device token", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },

  login: async (req, res, next) => {
    try {
      const { email, password, account_type } = req.body;
      logger.info(
        `Login attempt for: ${email} as ${account_type || "unspecified type"}`
      );

      const account = await AccountRepository.findOneByEmail(email);

      if (!account) {
        logger.warn(`Login failed - account not found: ${email}`);
        throw new BadRequestError("Account not found");
      }

      if (process.env.EMAIL_VERIFICATION_REQUIRED && !account.is_verified) {
        logger.warn(`Login failed - email not verified: ${email}`);
        throw new BadRequestError("Email not verified");
      }

      // Use Account model's checkPassword method
      const passwordMatch = await account.checkPassword(password);

      if (!passwordMatch) {
        logger.warn(`Login failed - invalid password for account: ${email}`);
        throw new UnauthorizedError();
      }

      // Default to parent if not specified in request
      const requestedType = account_type;

      // Check if the requested account type matches the stored account type
      if (requestedType !== account.account_type) {
        logger.warn(
          `Login failed - account type mismatch: ${email} requested ${requestedType} but is ${account.account_type}`
        );
        throw new BadRequestError(`You cannot login as ${requestedType}.`);
      }

      // Check profile completeness based on account_type
      let profileData = {};
      let profileComplete = false;
      let accountTypeId = null;

      if (requestedType === "parent") {
        const parent = await ParentRepository.findByAccountId(account.id);
        if (parent) {
          profileData.parent = parent;
          profileComplete = true;
          accountTypeId = parent.id;
        }
      } else if (requestedType === "driver") {
        const driver = await DriverRepository.findByAccountIdWithPapers(
          account.id
        );
        if (driver) {
          profileData.driver = driver;
          profileComplete = true;
          accountTypeId = driver.id;

          // Check if papers are uploaded for drivers
          if (driver.papers) {
            profileData.papersComplete = true;
          } else {
            profileData.papersComplete = false;
          }
        }
      }

      // Add claims to token for profile type
      const jwtResponse = JwtService.jwtSign(account.id, {
        accountType: requestedType,
        profileComplete,
        accountTypeId,
      });

      const { token } = jwtResponse;

      logger.info(`Login successful for account: ${email}`, {
        account_id: account.id,
        profile_complete: profileComplete,
      });

      if (jwtResponse.refreshToken) {
        return res.success("Login successful", {
          account: {
            id: account.id,
            email: account.email,
            is_verified: account.is_verified,
            profileComplete,
            accountType: requestedType,
            ...profileData,
          },
          token,
          refreshToken: jwtResponse.refreshToken,
        });
      }

      return res.success("Login successful", {
        account: {
          id: account.id,
          email: account.email,
          is_verified: account.is_verified,
          profileComplete,
          accountType: requestedType,
          ...profileData,
        },
        token,
      });
    } catch (error) {
      logger.error("Login error", { error: error.message, stack: error.stack });
      next(error);
    }
  },

  me: async (req, res, next) => {
    try {
      logger.info("Profile retrieval attempt", { accountId: req.userId });

      const account = await AccountRepository.findByIdExcludeProps(req.userId, [
        "password",
      ]);

      if (!account) {
        logger.warn("Profile not found", { accountId: req.userId });
        throw new NotFoundError("Profile not found");
      }

      // Get token claims to determine profile type
      const token = await JwtService.jwtGetToken(req);
      const decoded = await JwtService.jwtVerify(token);

      const accountType = decoded.accountType;

      // Get related data - parent or driver based on account type
      let profileData = {};
      let profileComplete = false;
      let stepsCompleted = { basicInfo: false, papers: false };

      if (accountType === "parent") {
        const parent = await ParentRepository.findByAccountIdWithChildren(
          account.id
        );
        if (parent) {
          profileData.parent = parent;
          profileComplete = true;
          stepsCompleted.basicInfo = true;
        }
      } else if (accountType === "driver") {
        const driver = await DriverRepository.findByAccountIdWithPapers(
          account.id
        );
        if (driver) {
          profileData.driver = driver;
          stepsCompleted.basicInfo = true;

          if (driver.papers) {
            stepsCompleted.papers = true;
            profileComplete = true;
          }
        }
      }

      return res.success("Profile retrieved successfully", {
        account: {
          id: account.id,
          email: account.email,
          is_verified: account.is_verified,
          auth_method: account.auth_method,
          accountType,
          profileComplete,
          stepsCompleted,
          ...profileData,
        },
      });
    } catch (error) {
      logger.error("Profile retrieval error", {
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  },

  refreshToken: (req, res, next) => {
    try {
      if (process.env.SERVER_JWT_REFRESH_ENABLED !== "true") {
        throw new BadRequestError("Refresh token functionality is not enabled");
      }

      const refreshToken = req.body.refresh_token;

      if (!refreshToken)
        throw new BadRequestError("Refresh token is required!");

      const token = JwtService.jwtRefreshToken(refreshToken);

      res.success("Refresh token exchanged successfully", { token });
    } catch (error) {
      logger.error("Refresh token error", {
        error: error.message,
        stack: error.stack,
      });
      next(new BadTokenError("Bad refresh token"));
    }
  },

  logout: async (req, res, next) => {
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
        logger.warn("No valid token found during logout", {
          error: error.message,
        });
      }

      res.success("Logged out successfully!");
    } catch (error) {
      logger.error("Logout error", { error: error.message });
      next(error);
    }
  },
};

module.exports = authController;
