import { NextRequest, NextResponse } from 'next/server';
import { logger, generateRequestId } from '@/lib/utils/logger';
import { BusinessErrors } from '@/lib/utils/error-handler';
import { ekpApprovalClient } from '@/lib/ekp-approval-client';

/**
 * 跟踪审批进度接口
 * 技能代码: track_approval_progress
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    logger.info({
      module: 'approval',
      action: 'track_progress',
      requestId,
      message: '跟踪审批进度请求',
      data: { path: '/api/approval/progress/track' },
    });

    // 解析请求参数
    const body = await request.json();
    const { requestId: approvalRequestId, userId } = body;

    // 参数校验
    if (!approvalRequestId || !userId) {
      throw BusinessErrors.invalidParams({
        missing: ['requestId', 'userId'],
      });
    }

    // 调用EKP审批客户端查询进度
    const progress = await ekpApprovalClient.getProgress(approvalRequestId, userId);

    logger.info({
      module: 'approval',
      action: 'track_progress_success',
      requestId,
      message: '审批进度查询成功',
      data: {
        requestId: approvalRequestId,
        currentNode: progress.currentNode.nodeName,
        status: progress.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: progress,
    });
  } catch (error: any) {
    logger.error({
      module: 'approval',
      action: 'track_progress_error',
      requestId,
      message: '跟踪审批进度失败',
      error: {
        type: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
