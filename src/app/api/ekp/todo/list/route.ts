/**
 * EKP 待办查询接口
 * GET /api/ekp/todo/list
 *
 * 这是一个标准的业务接口示例，展示了如何使用：
 * 1. 权限校验中间件
 * 2. 错误处理工具
 * 3. 日志记录工具
 * 4. API工具函数
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  checkPermission,
  PermissionRules,
  extractUserContext,
} from '@/lib/middleware/permission';
import {
  handleBusinessError,
  BusinessErrors,
  BusinessError,
} from '@/lib/utils/error-handler';
import { logger, generateRequestId } from '@/lib/utils/logger';
import {
  buildSuccessResponse,
  parsePaginationParams,
  buildPaginationMeta,
  validateRequiredParams,
  formatDate,
  calculateExecutionTime,
} from '@/lib/utils/api';
import { ekpClient } from '@/lib/ekp-client';

/**
 * GET /api/ekp/todo/list
 * 查询当前用户的待办列表
 *
 * @param request NextRequest对象
 * @returns NextResponse对象
 */
export async function GET(request: NextRequest) {
  // 1. 初始化上下文
  const requestId = generateRequestId();
  const startTime = Date.now();
  const userContext = extractUserContext(request);

  try {
    // 2. 记录请求日志
    logger.info({
      module: 'ekp',
      action: 'todo.list',
      userId: userContext.userId,
      requestId,
      message: '开始查询待办列表',
    });

    // 3. 权限校验
    const permissionResult = await checkPermission(
      PermissionRules.allLoggedIn, // 所有登录用户都可以查询
      request
    );

    if (!permissionResult.granted) {
      // 记录权限拒绝日志
      logger.warn({
        module: 'ekp',
        action: 'todo.list',
        userId: userContext.userId,
        requestId,
        message: '权限校验失败',
        error: {
          type: 'PermissionDenied',
          message: permissionResult.reason || '无权限',
        },
      });

      // 返回权限拒绝响应
      return NextResponse.json(
        handleBusinessError(
          BusinessErrors.permissionDenied({ reason: permissionResult.reason || '无权限' })
        ),
        { status: 403 }
      );
    }

    // 4. 解析查询参数
    const { searchParams } = new URL(request.url);

    // 必填参数校验
    const todoTypeStr = searchParams.get('todoType');
    const todoType = parseInt(todoTypeStr || '0');
    if (isNaN(todoType)) {
      throw BusinessErrors.invalidParams({
        field: 'todoType',
        expected: 'number',
        received: todoTypeStr,
      });
    }

    // 解析分页参数
    const { page, pageSize, offset } = parsePaginationParams(searchParams);

    // 5. 调用EKP接口
    logger.debug({
      module: 'ekp',
      action: 'todo.list',
      userId: userContext.userId,
      requestId,
      message: '调用EKP接口查询待办',
      data: {
        userId: userContext.userId,
        todoType,
        page,
        pageSize,
      },
    });

    let ekpResponse: any;
    try {
      ekpResponse = await ekpClient.getTodoCount({
        userId: userContext.userId,
        todoType,
        page,
        pageSize,
      });
    } catch (error) {
      throw BusinessErrors.ekpError({
        endpoint: '/sys-notify/sysNotifyTodoRestService/getTodo',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // 6. 处理响应数据
    const items = ekpResponse.items || [];
    const total = ekpResponse.count || 0;

    // 格式化日期字段
    const formattedItems = items.map((item: any) => ({
      ...item,
      createTime: item.createTime ? formatDate(item.createTime, 'DATETIME') : null,
      updateTime: item.updateTime ? formatDate(item.updateTime, 'DATETIME') : null,
    }));

    // 7. 记录成功日志
    logger.info({
      module: 'ekp',
      action: 'todo.list',
      userId: userContext.userId,
      requestId,
      message: '待办查询成功',
      data: {
        todoType,
        count: total,
        page,
        pageSize,
      },
    });

    // 8. 返回成功响应
    return NextResponse.json(
      buildSuccessResponse(
        formattedItems,
        '查询成功',
        {
          ...buildPaginationMeta(total, page, pageSize),
          executionTime: calculateExecutionTime(startTime),
        }
      )
    );
  } catch (error) {
    // 9. 错误处理
    const errorResponse = handleBusinessError(error);

    // 记录错误日志
    logger.error({
      module: 'ekp',
      action: 'todo.list',
      userId: userContext.userId,
      requestId,
      message: '待办查询失败',
      error: {
        type: errorResponse.error?.type || 'UnknownError',
        message: errorResponse.msg,
        stack: errorResponse.error?.stack,
      },
    });

    // 返回错误响应
    return NextResponse.json(errorResponse, {
      status: parseInt(errorResponse.code) || 500,
    });
  }
}
