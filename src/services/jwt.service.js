const crypto = require("crypto");
const {
  BadTokenError,
  InternalServerError,
} = require("../utils/errors/types/Api.error");
const jwt = require("jsonwebtoken");
const loggingService = require("../services/logging.service");
const redisService = require("../services/redis.service");
const logger = loggingService.getLogger();

// Use UUID instead of simple counter
const { v4: uuidv4 } = require("uuid");

const JwtService = {
  jwtSign: (accountId, additionalClaims = {}) => {
    try {
      if (process.env.SERVER_JWT !== "true")
        throw new Error("[JWT] Fastify JWT flag is not set");

      console.log("[JWT] Generating fastify JWT sign");

      // Combine account ID with additional claims into a complete payload
      const payload = {
        id: accountId,
        ...additionalClaims,
      };

      // Generate a truly unique jti using UUID instead of a counter
      const jwtid = uuidv4();

      const useExpiry = process.env.SERVER_JWT_USE_EXPIRY === "true";
      const expiresIn = useExpiry
        ? Number(process.env.SERVER_JWT_TIMEOUT)
        : undefined;

      const token = jwt.sign({ payload }, process.env.SERVER_JWT_SECRET, {
        ...(useExpiry && { expiresIn }),
        jwtid,
        algorithm: "HS256",
      });

      const response = { token };

      // Only generate refresh token if using expiry and refresh token is enabled
      if (useExpiry && process.env.SERVER_JWT_REFRESH_ENABLED === "true") {
        const refreshToken = jwt.sign(
          {
            sub: payload,
            jti: crypto.randomBytes(16).toString("hex"),
          },
          process.env.SERVER_JWT_REFRESH_SECRET,
          { expiresIn: Number(process.env.SERVER_JWT_REFRESH_MAX_AGE) }
        );
        response.refreshToken = refreshToken;
      }

      return response;
    } catch (error) {
      console.log("[JWT] Error during fastify JWT sign");
      throw error;
    }
  },

  jwtGetToken: (request) => {
    try {
      if (process.env.SERVER_JWT !== "true")
        throw new BadTokenError("[JWT] JWT flag is not set");

      let token = null;
      const authHeader = request.headers.authorization;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      } else {
        // If not in header, try cookies (for web)
        token = request.cookies?.token;
      }

      if (!token) throw new BadTokenError("[JWT] JWT token not provided");

      return token;
    } catch (error) {
      console.log("[JWT] Error getting JWT token");
      throw error;
    }
  },

  jwtVerify: async (token) => {
    if (process.env.SERVER_JWT !== "true")
      throw new Error("[JWT] JWT flag is not set");

    // Decode token first to check blacklist
    const decoded = jwt.decode(token);
    if (!decoded) {
      logger.error("[JWT] Invalid token format");
      throw new BadTokenError("[JWT] Invalid token format");
    }

    // Check if token is blacklisted (only if Redis is connected)
    try {
      if (redisService.isConnected()) {
        // Create a unique blacklist key using token fingerprint
        const tokenFingerprint = JwtService.createTokenFingerprint(decoded);
        const blacklisted = await redisService.get(
          `jwt:blacklist:${tokenFingerprint}`
        );

        if (blacklisted) {
          logger.warn(
            `[JWT] Token with fingerprint ${tokenFingerprint} has been revoked`
          );
          throw new BadTokenError("[JWT] Token has been revoked");
        }
      } else {
        logger.error(
          "[JWT] Redis not connected and blacklist check is required"
        );
        throw new InternalServerError(
          "[JWT] Unable to verify token against blacklist"
        );
      }
    } catch (error) {
      // If this is already a BadTokenError or InternalServerError, rethrow it
      if (
        error instanceof BadTokenError ||
        error instanceof InternalServerError
      ) {
        throw error;
      }
      // Otherwise, log the Redis error but continue with token verification
      logger.error("[JWT] Redis blacklist check failed:", redisError);
      throw new InternalServerError(redisError);
    }

    return jwt.verify(token, process.env.SERVER_JWT_SECRET, (err, decoded) => {
      if (err != null) {
        logger.error("[JWT] Token verification failed:", err.message);
        throw err;
      }
      return decoded.payload;
    });
  },

  jwtBlacklistToken: async (token) => {
    try {
      if (!token) {
        throw new BadTokenError("[JWT] No token provided");
      }

      const decoded = jwt.decode(token);
      if (!decoded) {
        throw new BadTokenError("[JWT] Invalid token format");
      }

      // Create a unique token fingerprint to use as blacklist key
      const tokenFingerprint = JwtService.createTokenFingerprint(decoded);
      const { exp } = decoded;

      // Get TTL values from environment variables with fallbacks
      const defaultTtl = parseInt(
        process.env.JWT_BLACKLIST_DEFAULT_TTL || "86400"
      );
      const fallbackTtl = parseInt(
        process.env.JWT_BLACKLIST_FALLBACK_TTL || "3600"
      );

      // Calculate TTL in seconds (token expiry - current time)
      const now = Math.floor(Date.now() / 1000);
      const ttl = exp ? exp - now : defaultTtl; // Use default TTL if no exp

      // Only try to blacklist if Redis is connected
      if (redisService.isConnected()) {
        // Store in Redis with TTL, using fallback if calculated TTL is invalid
        await redisService.set(
          `jwt:blacklist:${tokenFingerprint}`,
          true,
          ttl > 0 ? ttl : fallbackTtl
        );
        logger.info(
          `[JWT] Added token with fingerprint ${tokenFingerprint} to blacklist with TTL ${
            ttl > 0 ? ttl : fallbackTtl
          }`
        );
      } else {
        logger.warn(
          `[JWT] Redis not connected, could not blacklist token ${tokenFingerprint}`
        );
      }
    } catch (error) {
      logger.error("[JWT] Error blacklisting JWT token:", error);
      // Don't throw error if blacklisting fails - just log it
    }
  },

  jwtRefreshToken: (refreshToken) => {
    try {
      if (process.env.SERVER_JWT_REFRESH_ENABLED !== "true") {
        throw new Error("[JWT] Refresh tokens are not enabled");
      }

      const decoded = jwt.verify(
        refreshToken,
        process.env.SERVER_JWT_REFRESH_SECRET
      );

      const useExpiry = process.env.SERVER_JWT_USE_EXPIRY === "true";
      const expiresIn = useExpiry
        ? Number(process.env.SERVER_JWT_TIMEOUT)
        : undefined;

      const token = jwt.sign(
        { payload: decoded.payload },
        process.env.SERVER_JWT_SECRET,
        {
          ...(useExpiry && { expiresIn }),
          jwtid: jwtidCounter + "",
          algorithm: "HS256",
        }
      );

      return token;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Creates a unique fingerprint for a token from its claims
   * @param {Object} decodedToken - The decoded JWT token
   * @returns {string} A unique fingerprint for the token
   */
  createTokenFingerprint: (decodedToken) => {
    try {
      const { jti = "", iat = "", exp = "", sub = "" } = decodedToken;
      // Create a hash of multiple token properties to ensure uniqueness
      return crypto
        .createHash("sha256")
        .update(`${jti}-${iat}-${exp}-${JSON.stringify(sub)}`)
        .digest("hex");
    } catch (error) {
      logger.error("[JWT] Error creating token fingerprint:", error);
      // If we can't create a fingerprint, use a random one
      return crypto.randomBytes(16).toString("hex");
    }
  },

  /**
   * Generate a random password for social login accounts
   * @returns {string} A random secure password
   */
  generateRandomPassword: () => {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    const length = 16;
    let password = "";

    for (let i = 0; i < length; i++) {
      password += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    return password;
  },
};

module.exports = JwtService;
