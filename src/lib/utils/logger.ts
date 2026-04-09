/**
 * 统一日志工具
 * 用于所有业务接口的日志记录
 */

/**
 * 日志级别
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * 日志条目
 */
export interface LogEntry {
  level: LogLevel;
  timestamp: number;
  module: string;
  action: string;
  userId?: string;
  requestId?: string;
  message: string;
  data?: any;
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
}

/**
 * 日志工具类
 */
class Logger {
  /**
   * 记录日志
   */
  private log(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.module}:${entry.action}]`;

    let message = `${prefix} ${entry.message}`;

    // 添加上下文信息
    const context: string[] = [];
    if (entry.userId) context.push(`userId=${entry.userId}`);
    if (entry.requestId) context.push(`requestId=${entry.requestId}`);
    if (entry.data) context.push(`data=${JSON.stringify(entry.data)}`);

    if (context.length > 0) {
      message += ` - ${context.join(', ')}`;
    }

    // 输出日志
    switch (entry.level) {
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(message);
        }
        break;
      case 'info':
        console.info(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'error':
        console.error(message);
        if (entry.error) {
          console.error(`Error Type: ${entry.error.type}`);
          console.error(`Error Message: ${entry.error.message}`);
          if (entry.error.stack) {
            console.error(`Stack Trace:\n${entry.error.stack}`);
          }
        }
        break;
    }
  }

  /**
   * 记录INFO日志
   */
  info(entry: Omit<LogEntry, 'level' | 'timestamp'>): void {
    this.log({
      ...entry,
      level: 'info',
      timestamp: Date.now(),
    });
  }

  /**
   * 记录WARN日志
   */
  warn(entry: Omit<LogEntry, 'level' | 'timestamp'>): void {
    this.log({
      ...entry,
      level: 'warn',
      timestamp: Date.now(),
    });
  }

  /**
   * 记录ERROR日志
   */
  error(entry: Omit<LogEntry, 'level' | 'timestamp'>): void {
    this.log({
      ...entry,
      level: 'error',
      timestamp: Date.now(),
    });
  }

  /**
   * 记录DEBUG日志
   */
  debug(entry: Omit<LogEntry, 'level' | 'timestamp'>): void {
    this.log({
      ...entry,
      level: 'debug',
      timestamp: Date.now(),
    });
  }
}

// 导出单例
export const logger = new Logger();

/**
 * 生成请求ID
 * @returns 请求ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
