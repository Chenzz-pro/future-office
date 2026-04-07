/**
 * EKP 待办审批接口
 * POST /api/ekp/todo/[id]/approve
 *
 * 这是一个标准的业务接口示例，展示了如何处理：
 * 1. POST请求的参数解析
 * 2. 动态路由参数
 * 3. 业务逻辑校验
 * 4. 自定义权限检查
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  checkPermission,
  extractUserContext,
} from '@/lib/middleware/permission';
import {
  handleBusinessError,
  BusinessErrors,
} from '@/lib/utils/error-handler';
import { logger, generateRequestId } from '@/lib/utils/logger';
import {
  buildSuccessResponse,
  extractSkillParams,
  validateRequiredParams,
  formatDate,
  calculateExecutionTime,
} from '@/lib/utils/api';
import { ekpClient } from '@/lib/ekp-client';

/**
 * POST /api/ekp/todo/[id]/approve
 * 审批待办
 *
 * @param request NextRequest对象
 * @param params 路由参数 { id: string }
 * @returns NextResponse对象
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. 初始化上下文
  const requestId = generateRequestId();
  const startTime = Date.now();
  const userContext = extractUserContext(request);
  const { id: todoId } = await params;

  try {
    // 2. 记录请求日志
    logger.info({
      module: 'ekp',
      action: 'todo.approve',
      userId: userContext.userId,
      requestId,
      message: '开始审批待办',
      data: { todoId },
    });

    // 3. 权限校验
    const permissionResult = await checkPermission(
      {
        requireLogin: true,
        allowedRoles: ['admin', 'manager', 'user'], // 所有登录用户都可以审批
        customCheck: async (userContext, reqParams) => {
          // 检查用户是否有权限审批该待办
          // TODO: 实现具体逻辑（检查待办是否分配给当前用户）
          // 示例：查询数据库确认待办属于当前用户
          return true;
        },
      },
      request
    );

    if (!permissionResult.granted) {
      // 记录权限拒绝日志
      logger.warn({
        module: 'ekp',
        action: 'todo.approve',
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

    // 4. 解析请求参数
    const body = await request.json();
    const { data, remark, extras } = extractSkillParams(body);

    // 必填参数校验
    validateRequiredParams(data, ['comment']);

    const { comment } = data;
    const safeRemark = remark || '';

    // 业务逻辑校验
    if (!comment || comment.trim().length === 0) {
      throw BusinessErrors.invalidParams({
        field: 'comment',
        reason: '审批意见不能为空',
      });
    }

    // 5. 调用EKP接口
    logger.debug({
      module: 'ekp',
      action: 'todo.approve',
      userId: userContext.userId,
      requestId,
      message: '调用EKP接口审批待办',
      data: {
        todoId,
        userId: userContext.userId,
        comment,
      },
    });

    let ekpResponse: any;
    try {
      ekpResponse = await ekpClient.approveTodo({
        todoId,
        userId: userContext.userId,
        comment,
        remark: safeRemark,
      });
    } catch (error) {
      throw BusinessErrors.ekpError({
        endpoint: '/api/workflow/approve',
        todoId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // 6. 记录成功日志
    logger.info({
      module: 'ekp',
      action: 'todo.approve',
      userId: userContext.userId,
      requestId,
      message: '待办审批成功',
      data: {
        todoId,
        comment,
        status: 'approved',
      },
    });

    // 7. 返回成功响应
    return NextResponse.json(
      buildSuccessResponse(
        {
          todoId,
          status: 'approved',
          approvalTime: formatDate(new Date(), 'DATETIME'),
          approver: userContext.userId,
          comment,
        },
        '审批成功',
        {
          executionTime: calculateExecutionTime(startTime),
        }
      )
    );
  } catch (error) {
    // 8. 错误处理
    const errorResponse = handleBusinessError(error);

    // 记录错误日志
    logger.error({
      module: 'ekp',
      action: 'todo.approve',
      userId: userContext.userId,
      requestId,
      message: '待办审批失败',
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
