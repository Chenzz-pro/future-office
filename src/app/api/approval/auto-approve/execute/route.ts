import { NextRequest, NextResponse } from 'next/server';
import { logger, generateRequestId } from '@/lib/utils/logger';
import { BusinessErrors } from '@/lib/utils/error-handler';

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

    // TODO: 封装 EKP 自动审批接口
    // 这里需要调用 EKP REST 客户端执行自动审批
    // 示例：const result = await ekpClient.autoApprove(approvalRequestId, userId);

    // 模拟返回数据（实际应调用 EKP 接口）
    const approveResult = {
      requestId: approvalRequestId,
      status: 'auto_approved',
      approvedAt: new Date().toISOString(),
    };

    logger.info({
      module: 'approval',
      action: 'execute_auto_approve_success',
      requestId,
      message: 'EKP自动审批成功',
      data: { requestId: approvalRequestId },
    });

    return NextResponse.json({
      success: true,
      data: approveResult,
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
