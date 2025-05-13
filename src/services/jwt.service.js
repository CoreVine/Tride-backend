import * as crypto from 'crypto';
import { BadTokenError } from '../utils/errors/types/Api.error';
const jwt = require("jsonwebtoken");
const moment = require("moment");
const loggingService = require('../services/logging.service');
const logger = loggingService.getLogger();


let jwtidCounter = 0;
let blacklist = []; // TODO: Use redis

const JwtService = {
  jwtSign: (_payload) => {
    try {
      if (process.env.SERVER_JWT !== "true")
        throw new Error("[JWT] Fastify JWT flag is not set");

      console.log("[JWT] Generating fastify JWT sign");

      const payload = JSON.parse(JSON.stringify(_payload));

      jwtidCounter = jwtidCounter + 1;

      const useExpiry = process.env.SERVER_JWT_USE_EXPIRY === "true";
      const expiresIn = useExpiry ? Number(process.env.SERVER_JWT_TIMEOUT) : undefined;

      const token = jwt.sign({ payload }, process.env.SERVER_JWT_SECRET, {
        ...(useExpiry && { expiresIn }),
        jwtid: jwtidCounter + "",
        algorithm: 'HS256'
      });

      const response = { token };

      // Only generate refresh token if using expiry and refresh token is enabled
      if (useExpiry && process.env.SERVER_JWT_REFRESH_ENABLED === "true") {
        const refreshToken = jwt.sign(
          { 
            sub: payload,
            jti: crypto.randomBytes(16).toString('hex')
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

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        // If not in header, try cookies (for web)
        token = request.cookies?.token;        
      }

      if (!token)
        throw new BadTokenError("[JWT] JWT token not provided");

      return token;
    } catch (error) {
      console.log("[JWT] Error getting JWT token");
      throw error;
    }
  },

  jwtVerify: (token) => {
    try {
      if (process.env.SERVER_JWT !== "true")
        throw new Error("[JWT] JWT flag is not set");

      return jwt.verify(
        token,
        process.env.SERVER_JWT_SECRET,
        (err, decoded) => {
          blacklist.forEach((element) => {
            if (
              element.jti === decoded.jti &&
              element.iat === decoded.iat &&
              element.exp === decoded.exp
            )
              throw err;
          });

          console.log(decoded);
          if (err != null) throw err;
          return decoded.payload;
        }
      );
    } catch (error) {
      console.log("[JWT] Error getting JWT token");
      throw error;
    }
  },

  jwtBlacklistToken: (token) => {
    try {
      while (
        blacklist.length &&
        moment().diff("1970-01-01 00:00:00Z", "seconds") > blacklist[0].exp
      ) {
        console.log(
          `[JWT] Removing from blacklist timed out JWT with id ${blacklist[0].jti}`
        );
        blacklist.shift();
      }
      
      if(!token) {
        throw BadTokenError();
      }

      const { jti, exp, iat } = jwt.decode(token);
      console.log(`[JWT] Adding JWT ${token} with id ${jti} to blacklist`);
      blacklist.push({ jti, exp, iat });
    } catch (error) {
      console.log("[JWT] Error blacklisting fastify JWT token");
      throw error;
    }
  },

  jwtRefreshToken: (refreshToken) => {
    try {
      if (process.env.SERVER_JWT_REFRESH_ENABLED !== "true") {
        throw new Error("[JWT] Refresh tokens are not enabled");
      }

      const decoded = jwt.verify(refreshToken, process.env.SERVER_JWT_REFRESH_SECRET);

      const useExpiry = process.env.SERVER_JWT_USE_EXPIRY === "true";
      const expiresIn = useExpiry ? Number(process.env.SERVER_JWT_TIMEOUT) : undefined;

      const token = jwt.sign({ payload: decoded.payload }, process.env.SERVER_JWT_SECRET, {
        ...(useExpiry && { expiresIn }),
        jwtid: jwtidCounter + "",
        algorithm: 'HS256'
      });

      return token;
    } catch (error) {
      throw error;
    }
    
  }
};

module.exports = JwtService;
