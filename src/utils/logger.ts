/**
 * 日志工具模块
 * 提供统一的日志记录功能，支持不同级别和环境配置
 *
 * @module utils/logger
 * @version 2.0.0
 */

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 日志条目接口
 */
interface LogEntry {
  /** 日志级别 */
  level: LogLevel;
  /** 日志消息 */
  message: string;
  /** 时间戳 */
  timestamp: string;
  /** 上下文数据 */
  context?: Record<string, unknown>;
  /** 错误对象（可选） */
  error?: Error;
}

/**
 * 日志配置选项
 */
interface LoggerConfig {
  /** 最小日志级别 */
  minLevel: LogLevel;
  /** 是否启用控制台输出 */
  enableConsole: boolean;
  /** 是否启用文件输出 */
  enableFile: boolean;
  /** 日志文件路径（仅在生产环境使用） */
  logFilePath?: string;
  /** 是否包含时间戳 */
  includeTimestamp: boolean;
  /** 是否包含调用位置 */
  includeCaller: boolean;
}

/**
 * 默认日志配置
 */
const defaultConfig: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableFile: process.env.NODE_ENV === 'production',
  logFilePath: './logs/app.log',
  includeTimestamp: true,
  includeCaller: false,
};

/**
 * 当前日志配置
 */
let currentConfig: LoggerConfig = { ...defaultConfig };

/**
 * 内存中的日志缓存（用于生产环境批量写入）
 */
const logBuffer: LogEntry[] = [];

/**
 * 日志级别名称映射
 */
const levelNames: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

/**
 * 日志级别颜色映射（控制台）
 */
const levelColors: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m', // 青色
  [LogLevel.INFO]: '\x1b[32m', // 绿色
  [LogLevel.WARN]: '\x1b[33m', // 黄色
  [LogLevel.ERROR]: '\x1b[31m', // 红色
};

/**
 * 格式化日志条目
 * @param entry - 日志条目
 * @returns 格式化后的字符串
 */
function formatLogEntry(entry: LogEntry): string {
  const parts: string[] = [];

  if (currentConfig.includeTimestamp) {
    parts.push(`[${entry.timestamp}]`);
  }

  parts.push(`[${levelNames[entry.level]}]`);
  parts.push(entry.message);

  if (entry.context && Object.keys(entry.context).length > 0) {
    parts.push(JSON.stringify(entry.context));
  }

  if (entry.error) {
    parts.push(`Error: ${entry.error.message}`);
    if (entry.error.stack) {
      parts.push(`Stack: ${entry.error.stack}`);
    }
  }

  return parts.join(' ');
}

/**
 * 获取当前时间戳
 * @returns ISO 格式时间戳
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 写入日志到输出
 * @param entry - 日志条目
 */
function writeLog(entry: LogEntry): void {
  if (entry.level < currentConfig.minLevel) {
    return;
  }

  // 控制台输出
  if (currentConfig.enableConsole) {
    const formatted = formatLogEntry(entry);
    const color = levelColors[entry.level];
    const reset = '\x1b[0m';

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(`${color}${formatted}${reset}`);
        break;
      case LogLevel.WARN:
        console.warn(`${color}${formatted}${reset}`);
        break;
      case LogLevel.INFO:
        console.info(`${color}${formatted}${reset}`);
        break;
      default:
        console.log(`${color}${formatted}${reset}`);
    }
  }

  // 生产环境文件输出
  if (currentConfig.enableFile && process.env.NODE_ENV === 'production') {
    logBuffer.push(entry);
    // 当缓冲区达到一定大小时，可以触发批量写入
    if (logBuffer.length >= 100) {
      flushLogs();
    }
  }
}

/**
 * 刷新日志缓冲区到文件
 * 注：实际文件写入需要 Node.js 环境，浏览器环境仅缓存
 */
function flushLogs(): void {
  if (logBuffer.length === 0) return;

  // 在浏览器环境中，可以将日志发送到远程服务器
  // 在 Node.js 环境中，可以写入文件
  if (typeof window === 'undefined') {
    // Node.js 环境
    try {
      const fs = require('fs');
      const path = require('path');

      const logDir = path.dirname(currentConfig.logFilePath || './logs/app.log');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logContent = logBuffer.map(formatLogEntry).join('\n') + '\n';
      fs.appendFileSync(currentConfig.logFilePath || './logs/app.log', logContent);
      logBuffer.length = 0;
    } catch (error) {
      console.error('Failed to write logs to file:', error);
    }
  }
}

/**
 * 配置日志器
 * @param config - 部分配置选项
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * 记录调试日志
 * @param message - 日志消息
 * @param context - 上下文数据
 */
export function debug(message: string, context?: Record<string, unknown>): void {
  writeLog({
    level: LogLevel.DEBUG,
    message,
    timestamp: getTimestamp(),
    context,
  });
}

/**
 * 记录信息日志
 * @param message - 日志消息
 * @param context - 上下文数据
 */
export function info(message: string, context?: Record<string, unknown>): void {
  writeLog({
    level: LogLevel.INFO,
    message,
    timestamp: getTimestamp(),
    context,
  });
}

/**
 * 记录警告日志
 * @param message - 日志消息
 * @param context - 上下文数据
 * @param error - 错误对象
 */
export function warn(
  message: string,
  context?: Record<string, unknown>,
  error?: Error
): void {
  writeLog({
    level: LogLevel.WARN,
    message,
    timestamp: getTimestamp(),
    context,
    error,
  });
}

/**
 * 记录错误日志
 * @param message - 日志消息
 * @param error - 错误对象
 * @param context - 上下文数据
 */
export function error(
  message: string,
  error?: Error | unknown,
  context?: Record<string, unknown>
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  writeLog({
    level: LogLevel.ERROR,
    message,
    timestamp: getTimestamp(),
    context,
    error: errorObj,
  });
}

/**
 * 创建带上下文的日志器
 * @param defaultContext - 默认上下文
 * @returns 绑定上下文的日志方法
 */
export function createContextLogger(defaultContext: Record<string, unknown>) {
  return {
    debug: (message: string, context?: Record<string, unknown>) =>
      debug(message, { ...defaultContext, ...context }),
    info: (message: string, context?: Record<string, unknown>) =>
      info(message, { ...defaultContext, ...context }),
    warn: (message: string, context?: Record<string, unknown>, err?: Error) =>
      warn(message, { ...defaultContext, ...context }, err),
    error: (message: string, err?: Error | unknown, context?: Record<string, unknown>) =>
      error(message, err, { ...defaultContext, ...context }),
  };
}

/**
 * 向后兼容的日志对象
 * @deprecated 请使用新的函数式 API
 */
export const logger = {
  debug,
  info,
  warn,
  error,
};

/**
 * 在应用关闭前刷新日志
 */
export function shutdownLogger(): void {
  flushLogs();
}

// 页面卸载时刷新日志
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', shutdownLogger);
}
