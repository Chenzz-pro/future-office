import { NextRequest, NextResponse } from 'next/server';
import { logger, generateRequestId } from '@/lib/utils/logger';
import { BusinessErrors } from '@/lib/utils/error-handler';

/**
 * 发起EKP审批接口
 * 技能代码: ekp_launch_approval
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    logger.info({
      module: 'approval',
      action: 'launch_approval',
      requestId,
      message: '发起EKP审批请求',
      data: { path: '/api/approval/launch' },
    });

    // 解析请求参数
    const body = await request.json();
    const { formData, flowNodes, userId } = body;

    // 参数校验
    if (!formData || !flowNodes || !userId) {
      throw BusinessErrors.invalidParams({
        missing: ['formData', 'flowNodes', 'userId'],
      });
    }

    // TODO: 封装 EKP 发起审批接口
    // 这里需要调用 EKP REST 客户端发起审批流程
    // 示例：const ekpResult = await ekpClient.launchApproval(formData, flowNodes, userId);

    // 模拟返回数据（实际应调用 EKP 接口）
    const launchResult = {
      requestId: `REQ_${Date.now()}`,
      status: 'pending',
    };

    logger.info({
      module: 'approval',
      action: 'launch_approval_success',
      requestId,
      message: 'EKP审批发起成功',
      data: { requestId: launchResult.requestId },
    });

    return NextResponse.json({
      success: true,
      data: launchResult,
    });
  } catch (error: any) {
    logger.error({
      module: 'approval',
      action: 'launch_approval_error',
      requestId,
      message: '发起EKP审批失败',
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
