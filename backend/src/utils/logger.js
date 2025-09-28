const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;

    let log = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }

    return log;
  })
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: format
  }),

  // Error log file
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Combined log file
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Add HTTP request logging
logger.http = (message, meta = {}) => {
  logger.log('http', message, meta);
};

// Add request context logging
logger.withContext = (context) => {
  return {
    error: (message, meta = {}) => logger.error(message, { ...meta, context }),
    warn: (message, meta = {}) => logger.warn(message, { ...meta, context }),
    info: (message, meta = {}) => logger.info(message, { ...meta, context }),
    http: (message, meta = {}) => logger.http(message, { ...meta, context }),
    debug: (message, meta = {}) => logger.debug(message, { ...meta, context }),
  };
};

// Log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason: reason.stack || reason
  });
});

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.stack || error,
    message: error.message
  });
});

module.exports = logger;