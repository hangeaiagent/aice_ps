import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 创建日志目录
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 日志级别
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

class Logger {
  constructor(module = 'GENERAL') {
    this.module = module;
  }

  _formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      module: this.module,
      message,
      ...(data && { data })
    };
    
    return JSON.stringify(logEntry, null, 2);
  }

  _writeLog(level, message, data = null) {
    const formattedMessage = this._formatMessage(level, message, data);
    
    // 输出到控制台
    console.log(`[${new Date().toISOString()}] [${this.module}] [${level}] ${message}`);
    if (data) {
      console.log(`[${new Date().toISOString()}] [${this.module}] [DATA]`, data);
    }
    
    // 写入日志文件
    const logFile = path.join(logDir, `${this.module.toLowerCase()}.log`);
    const logLine = `${formattedMessage}\n`;
    
    try {
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  error(message, data = null) {
    this._writeLog(LOG_LEVELS.ERROR, message, data);
  }

  warn(message, data = null) {
    this._writeLog(LOG_LEVELS.WARN, message, data);
  }

  info(message, data = null) {
    this._writeLog(LOG_LEVELS.INFO, message, data);
  }

  debug(message, data = null) {
    this._writeLog(LOG_LEVELS.DEBUG, message, data);
  }
}

export default Logger;
