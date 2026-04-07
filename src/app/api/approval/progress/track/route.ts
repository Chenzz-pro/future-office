import { NextRequest, NextResponse } from 'next/server';
import { logger, generateRequestId } from '@/lib/utils/logger';
import { BusinessErrors } from '@/lib/utils/error-handler';

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

    // TODO: 调用 EKP 查询进度接口
    // 这里需要调用 EKP REST 客户端查询审批进度
    // 示例：const progress = await ekpClient.getApprovalProgress(approvalRequestId, userId);

    // 模拟返回数据（实际应调用 EKP 接口）
    const progress = {
      requestId: approvalRequestId,
      currentNode: '审批中',
      status: 'pending',
      timeoutNodes: [],
      history: [
        {
          node: '发起人',
          status: 'approved',
          time: new Date().toISOString(),
        },
      ],
    };

    logger.info({
      module: 'approval',
      action: 'track_progress_success',
      requestId,
      message: '审批进度查询成功',
      data: { requestId: approvalRequestId, currentNode: progress.currentNode },
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
