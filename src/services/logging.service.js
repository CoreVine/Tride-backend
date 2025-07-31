require('dotenv').config();
const winston = require('winston');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
require('winston-daily-rotate-file');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format that properly handles objects
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...rest }) => {
    // Basic message with timestamp and level
    let output = `${timestamp} ${level}: ${message}`;
    
    // Only process and append additional data if it exists and isn't empty
    const metaData = Object.keys(rest).filter(key => !['service', 'stack'].includes(key));
    if (metaData.length > 0) {
      output += ` ${JSON.stringify(rest, null, 0)}`;
    }
    
    // Add stack trace if it exists
    if (rest.stack) {
      output += `\n${rest.stack}`;
    }
    
    return output;
  })
);

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'api' },
  transports: [
    // Console transport with optimized format
    new winston.transports.Console({ format: consoleFormat, level: process.env.NODE_ENV === "production" ? "info" : "debug" }),
    // Daily rotate file transport for all logs
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),
    // Daily rotate file transport for error logs
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
      zippedArchive: true
    })
  ]
});

// Create stream for Morgan to use Winston
const morganStream = {
  write: (message) => {
    // Use warn level for HTTP errors
    logger.warn(message.trim());
  }
};

// Configure Morgan with custom format focusing on errors
const httpLogger = morgan((tokens, req, res) => {
  const status = tokens.status(req, res);
  if (status >= 400) {
    return [
      tokens.method(req, res),
      tokens.url(req, res),
      status,
      tokens['remote-addr'](req, res),
      '-',
      tokens['response-time'](req, res), 'ms'
    ].join(' ');
  }
  return null; // Skip logging for 2xx/3xx responses in production
}, { stream: morganStream });

// Development morgan format - more verbose
const devHttpLogger = morgan('dev', { 
  stream: { 
    write: (message) => logger.info(message.trim()) 
  } 
});

const loggingService = {
  init: async () => {
    try {
      logger.info('[LOGGING] Logging service initialized');
      // Configure and return logging components
      return {
        logger,
        morgan: process.env.NODE_ENV === 'production' ? httpLogger : devHttpLogger
      };
    } catch (error) {
      console.error('[LOGGING] Error during logging service initialization', error);
      throw error;
    }
  },
  getLogger: () => logger
};

module.exports = loggingService;
