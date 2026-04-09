/**
 * 会议创建接口
 * POST /api/meeting/create
 *
 * 这是一个标准的业务接口示例，展示了如何处理：
 * 1. 数据库操作
 * 2. 业务冲突检查
 * 3. 复杂参数校验
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
} from '@/lib/utils/error-handler';
import { logger, generateRequestId } from '@/lib/utils/logger';
import {
  buildSuccessResponse,
  extractSkillParams,
  validateRequiredParams,
  formatDate,
  calculateExecutionTime,
} from '@/lib/utils/api';
import { dbManager } from '@/lib/database/manager';

/**
 * 会议数据接口
 */
interface MeetingData {
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  participants: string[];
  description?: string;
  reminder?: boolean;
}

/**
 * POST /api/meeting/create
 * 创建会议
 *
 * @param request NextRequest对象
 * @returns NextResponse对象
 */
export async function POST(request: NextRequest) {
  // 1. 初始化上下文
  const requestId = generateRequestId();
  const startTime = Date.now();
  const userContext = extractUserContext(request);

  try {
    // 2. 记录请求日志
    logger.info({
      module: 'meeting',
      action: 'create',
      userId: userContext.userId,
      requestId,
      message: '开始创建会议',
    });

    // 3. 权限校验
    const permissionResult = await checkPermission(
      PermissionRules.allLoggedIn, // 所有登录用户都可以创建会议
      request
    );

    if (!permissionResult.granted) {
      // 记录权限拒绝日志
      logger.warn({
        module: 'meeting',
        action: 'create',
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
    const { data, remark } = extractSkillParams(body);

    // 必填参数校验
    validateRequiredParams(data, ['title', 'startTime', 'endTime', 'location']);

    const meetingData: MeetingData = {
      title: data.title,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      participants: data.participants || [],
      description: data.description,
      reminder: data.reminder ?? true,
    };

    // 业务逻辑校验
    if (!meetingData.title || meetingData.title.trim().length === 0) {
      throw BusinessErrors.invalidParams({
        field: 'title',
        reason: '会议标题不能为空',
      });
    }

    if (new Date(meetingData.startTime) >= new Date(meetingData.endTime)) {
      throw BusinessErrors.invalidParams({
        field: 'time',
        reason: '结束时间必须大于开始时间',
      });
    }

    // 5. 检查会议时间冲突
    logger.debug({
      module: 'meeting',
      action: 'create',
      userId: userContext.userId,
      requestId,
      message: '检查会议时间冲突',
      data: {
        location: meetingData.location,
        startTime: meetingData.startTime,
        endTime: meetingData.endTime,
      },
    });

    try {
      const conflictResult = await dbManager.query(
        `
        SELECT COUNT(*) as count
        FROM meetings
        WHERE location = ?
        AND status != 'cancelled'
        AND (
          (start_time <= ? AND end_time >= ?)
          OR (start_time <= ? AND end_time >= ?)
          OR (start_time >= ? AND end_time <= ?)
        )
        `,
        [
          meetingData.location,
          meetingData.startTime,
          meetingData.startTime,
          meetingData.endTime,
          meetingData.endTime,
          meetingData.startTime,
          meetingData.endTime,
        ]
      );

      const conflictCount = (conflictResult.rows[0] as { count: number }).count;
      if (conflictCount > 0) {
        throw BusinessErrors.conflict({
          type: 'time_conflict',
          reason: `会议时间冲突，${meetingData.location}在该时间段已被占用`,
          location: meetingData.location,
          startTime: meetingData.startTime,
          endTime: meetingData.endTime,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'BusinessError') {
        throw error;
      }
      throw BusinessErrors.databaseError({
        operation: 'check_conflict',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // 6. 创建会议
    logger.debug({
      module: 'meeting',
      action: 'create',
      userId: userContext.userId,
      requestId,
      message: '插入会议记录到数据库',
      data: {
        title: meetingData.title,
        startTime: meetingData.startTime,
        endTime: meetingData.endTime,
        location: meetingData.location,
      },
    });

    const meetingId = crypto.randomUUID();
    try {
      await dbManager.query(
        `
        INSERT INTO meetings
        (id, title, start_time, end_time, location, creator_id, participants, description, reminder, status, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          meetingId,
          meetingData.title,
          meetingData.startTime,
          meetingData.endTime,
          meetingData.location,
          userContext.userId,
          JSON.stringify(meetingData.participants),
          meetingData.description,
          meetingData.reminder ? 1 : 0,
          'scheduled',
          remark || '',
        ]
      );
    } catch (error) {
      throw BusinessErrors.databaseError({
        operation: 'create_meeting',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // 7. 记录成功日志
    logger.info({
      module: 'meeting',
      action: 'create',
      userId: userContext.userId,
      requestId,
      message: '会议创建成功',
      data: {
        meetingId,
        title: meetingData.title,
        startTime: meetingData.startTime,
        endTime: meetingData.endTime,
        location: meetingData.location,
      },
    });

    // 8. 返回成功响应
    return NextResponse.json(
      buildSuccessResponse(
        {
          meetingId,
          title: meetingData.title,
          startTime: formatDate(meetingData.startTime, 'DATETIME'),
          endTime: formatDate(meetingData.endTime, 'DATETIME'),
          location: meetingData.location,
          participants: meetingData.participants,
          creator: userContext.userId,
          status: 'scheduled',
        },
        '创建成功',
        {
          executionTime: calculateExecutionTime(startTime),
        }
      )
    );
  } catch (error) {
    // 9. 错误处理
    const errorResponse = handleBusinessError(error);

    // 记录错误日志
    logger.error({
      module: 'meeting',
      action: 'create',
      userId: userContext.userId,
      requestId,
      message: '会议创建失败',
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
