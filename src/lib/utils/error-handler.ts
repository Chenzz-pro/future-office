/**
 * 统一错误处理工具
 * 用于所有业务接口的错误处理
 */

/**
 * 业务错误类
 */
export class BusinessError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

/**
 * 错误响应接口
 */
export interface ErrorResponse {
  code: string;
  msg: string;
  error?: {
    type: string;
    details?: any;
    stack?: string;
  };
  timestamp: number;
}

/**
 * 处理业务错误
 * @param error 错误对象
 * @returns 标准错误响应
 */
export function handleBusinessError(error: unknown): ErrorResponse {
  // 1. 业务错误
  if (error instanceof BusinessError) {
    return {
      code: error.code,
      msg: error.message,
      error: {
        type: error.name,
        details: error.details,
      },
      timestamp: Date.now(),
    };
  }

  // 2. 标准错误
  if (error instanceof Error) {
    return {
      code: '500',
      msg: error.message,
      error: {
        type: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      timestamp: Date.now(),
    };
  }

  // 3. 未知错误
  return {
    code: '500',
    msg: '服务器内部错误',
    error: {
      type: 'UnknownError',
    },
    timestamp: Date.now(),
  };
}

/**
 * 预定义的业务错误
 */
export const BusinessErrors = {
  // 请求参数错误
  invalidParams: (details?: any) =>
    new BusinessError('400', '请求参数错误', details),

  // 资源不存在
  notFound: (resource: string, details?: any) =>
    new BusinessError('404', `${resource}不存在`, details),

  // 无权限
  permissionDenied: (details?: any) =>
    new BusinessError('403', '您没有权限执行此操作', details),

  // 未授权（未登录）
  unauthorized: (details?: any) =>
    new BusinessError('401', '请先登录', details),

  // 资源冲突
  conflict: (details?: any) =>
    new BusinessError('409', '资源冲突', details),

  // 服务不可用
  serviceUnavailable: (service: string, details?: any) =>
    new BusinessError('503', `${service}服务不可用`, details),

  // EKP服务错误
  ekpError: (details?: any) =>
    new BusinessError('500', 'EKP服务错误', details),

  // 数据库错误
  databaseError: (details?: any) =>
    new BusinessError('500', '数据库错误', details),

  // 外部接口错误
  externalApiError: (api: string, details?: any) =>
    new BusinessError('500', `${api}接口错误`, details),
};

/**
 * 异步错误处理包装器
 * @param fn 异步函数
 * @returns 包装后的函数
 */
export function withErrorHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R | ErrorResponse> {
  return async (...args: T): Promise<R | ErrorResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleBusinessError(error);
    }
  };
}
