/**
 * API 工具函数
 * 用于构造标准响应和处理请求参数
 */

import { NextRequest } from 'next/server';

/**
 * 成功响应接口
 */
export interface SuccessResponse<T = any> {
  code: '200';
  msg: string;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    executionTime?: number;
  };
  timestamp: number;
}

/**
 * 构造成功响应
 * @param data 响应数据
 * @param msg 响应消息
 * @param meta 元数据
 * @returns 成功响应
 */
export function buildSuccessResponse<T>(
  data: T,
  msg: string = '操作成功',
  meta?: any
): SuccessResponse<T> {
  const response: SuccessResponse<T> = {
    code: '200',
    msg,
    data,
    timestamp: Date.now(),
  };

  if (meta) {
    response.meta = meta;
  }

  return response;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
}

/**
 * 解析分页参数
 * @param searchParams URLSearchParams
 * @returns 分页参数
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
  const offset = (page - 1) * pageSize;

  return { page, pageSize, offset };
}

/**
 * 分页元数据
 */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 构造分页元数据
 * @param total 总数
 * @param page 当前页
 * @param pageSize 每页数量
 * @returns 分页元数据
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  pageSize: number
): PaginationMeta {
  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 提取技能调用参数
 * @param body 请求体
 * @returns 技能参数
 */
export function extractSkillParams(body: any): {
  data: Record<string, any>;
  remark?: string;
  extras?: Record<string, any>;
} {
  return {
    data: body.data || {},
    remark: body.remark,
    extras: body.extras,
  };
}

/**
 * 验证必填参数
 * @param params 参数对象
 * @param requiredFields 必填字段列表
 * @throws BusinessError 如果缺少必填参数
 */
export function validateRequiredParams(
  params: Record<string, any>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(field => !params[field]);

  if (missingFields.length > 0) {
    throw new Error(`缺少必填参数: ${missingFields.join(', ')}`);
  }
}

/**
 * 清理敏感数据
 * @param data 数据对象
 * @param sensitiveFields 敏感字段列表
 * @returns 清理后的数据
 */
export function sanitizeData(
  data: any,
  sensitiveFields: string[] = ['password', 'token', 'apiKey']
): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized: any = Array.isArray(data) ? [] : {};

  for (const key in data) {
    if (sensitiveFields.includes(key)) {
      sanitized[key] = '***';
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      sanitized[key] = sanitizeData(data[key], sensitiveFields);
    } else {
      sanitized[key] = data[key];
    }
  }

  return sanitized;
}

/**
 * 格式化日期
 * @param date 日期对象或字符串
 * @param format 格式
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  date: Date | string,
  format: 'ISO' | 'DATE' | 'DATETIME' | 'TIME' = 'DATETIME'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  switch (format) {
    case 'ISO':
      return d.toISOString();
    case 'DATE':
      return d.toISOString().split('T')[0];
    case 'DATETIME':
      return d.toISOString().replace('T', ' ').substring(0, 19);
    case 'TIME':
      return d.toISOString().split('T')[1].substring(0, 8);
    default:
      return d.toISOString();
  }
}

/**
 * 计算执行时间
 * @param startTime 开始时间戳
 * @returns 执行时间（毫秒）
 */
export function calculateExecutionTime(startTime: number): number {
  return Date.now() - startTime;
}
