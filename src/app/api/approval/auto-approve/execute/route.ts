import { NextRequest, NextResponse } from 'next/server';
import { logger, generateRequestId } from '@/lib/utils/logger';
import { BusinessErrors } from '@/lib/utils/error-handler';
import { ekpApprovalClient } from '@/lib/ekp-approval-client';

/**
 * 执行EKP自动审批接口
 * 技能代码: ekp_auto_approve
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    logger.info({
      module: 'approval',
      action: 'execute_auto_approve',
      requestId,
      message: '执行EKP自动审批请求',
      data: { path: '/api/approval/auto-approve/execute' },
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

    // 调用EKP审批客户端执行自动审批
    const approveResult = await ekpApprovalClient.autoApprove(approvalRequestId, userId);

    logger.info({
      module: 'approval',
      action: 'execute_auto_approve_success',
      requestId,
      message: 'EKP自动审批成功',
      data: { requestId: approvalRequestId, status: approveResult.status },
    });

    return NextResponse.json({
      success: true,
      data: {
        requestId: approvalRequestId,
        status: approveResult.status,
        approvedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error({
      module: 'approval',
      action: 'execute_auto_approve_error',
      requestId,
      message: '执行EKP自动审批失败',
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
