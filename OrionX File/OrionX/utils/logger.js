import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '../logs');

// Tạo logs folder nếu chưa có
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ==========================================
// DEFINE LOG LEVELS
// ==========================================
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  trace: 'gray'
};

winston.addColors(colors);

// ==========================================
// CREATE LOGGER
// ==========================================
const logger = winston.createLogger({
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      if (stack) {
        return `[${timestamp}] [${level.toUpperCase()}] ${message}\n${stack}`;
      }
      return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    // === ERROR LOG ===
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          if (stack) {
            return `[${timestamp}] ${message}\n${stack}`;
          }
          return `[${timestamp}] ${message}`;
        })
      )
    }),

    // === COMBINED LOG (Tất cả)
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          if (stack) {
            return `[${timestamp}] [${level.toUpperCase()}] ${message}\n${stack}`;
          }
          return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        })
      )
    }),

    // === ACTIVITY LOG (Commands, Events)
    new winston.transports.File({
      filename: path.join(logsDir, 'activity.log'),
      level: 'info',
      maxsize: 5242880,
      maxFiles: 10,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, message }) => {
          return `[${timestamp}] ${message}`;
        })
      )
    }),

    // === CONSOLE OUTPUT
    new winston.transports.Console({
      level: 'info', // Show info logs on console to track startup progress
      format: winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
          // Bỏ các emoji ở đầu câu để PowerShell không bị lỗi font
          let cleanMsg = typeof message === 'string'
            ? message.replace(/^([^\x00-\x7F]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F\uDE80-\uDEFF]|\uD83E[\uDD00-\uDDFF]|[\u2600-\u27BF])+\s*/, '')
            : message;

          let levelIcon = '';
          let colorMsg = cleanMsg;

          switch (level) {
            case 'info':
              levelIcon = '\x1b[36mℹ\x1b[0m';
              colorMsg = `\x1b[32m${cleanMsg}\x1b[0m`;
              break;
            case 'warn':
              levelIcon = '\x1b[33m⚠\x1b[0m';
              colorMsg = `\x1b[33m${cleanMsg}\x1b[0m`;
              break;
            case 'error':
              levelIcon = '\x1b[31m✖\x1b[0m';
              colorMsg = `\x1b[31m${cleanMsg}\x1b[0m`;
              break;
            case 'debug':
              levelIcon = '\x1b[34m🐛\x1b[0m';
              colorMsg = `\x1b[34m${cleanMsg}\x1b[0m`;
              break;
            default:
              levelIcon = `[${level}]`;
          }

          let out = `\x1b[90m${timestamp}\x1b[0m  ${levelIcon}  ${colorMsg}`;

          let errStack = stack;
          if (!errStack && meta && meta.message && meta.stack) {
            errStack = meta.stack;
          } else if (!errStack && Object.keys(meta).length > 0) {
            for (const key in meta) {
              if (meta[key] instanceof Error) {
                errStack = meta[key].stack;
                break;
              }
            }
          }

          if (errStack) {
            out += `\n\x1b[31m${errStack}\x1b[0m`; // Màu đỏ cho stack trace
          }
          return out;
        })
      )
    })
  ],
  // Không dùng rejectionHandlers mặc định để tránh log "Invalid shard" (từ @discordjs/ws) ra file/console.
  // Các rejection được xử lý trong index.js / shard.js.
  rejectionHandlers: [],
  exitOnError: false
});

// ==========================================
// EXPORT LOGGER
// ==========================================
export default logger;

/**
 * Logger methods:
 * logger.error(message) - Critical errors
 * logger.warn(message) - Warnings
 * logger.info(message) - General info
 * logger.debug(message) - Debug info
 * logger.trace(message) - Trace info
 */
