import { NextRequest, NextResponse } from 'next/server';
import { AutoApproveEngine } from '@/lib/approval/auto-approve-engine';
import { logger, generateRequestId } from '@/lib/utils/logger';
import { BusinessErrors } from '@/lib/utils/error-handler';

/**
 * 检查自动审批规则接口
 * 技能代码: run_auto_approve_rules
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    logger.info({
      module: 'approval',
      action: 'check_auto_approve',
      requestId,
      message: '检查自动审批规则请求',
      data: { path: '/api/approval/auto-approve/check' },
    });

    // 解析请求参数
    const body = await request.json();
    const { autoApproveConfig, approval_type, amount } = body;

    // 参数校验
    if (!autoApproveConfig || !approval_type) {
      throw BusinessErrors.invalidParams({
        missing: ['autoApproveConfig', 'approval_type'],
      });
    }

    // 创建规则引擎
    const engine = new AutoApproveEngine(autoApproveConfig);

    // 检查是否可以自动审批
    const canAutoApprove = engine.canAutoApprove({
      approval_type,
      amount,
    });

    logger.info({
      module: 'approval',
      action: 'check_auto_approve_success',
      requestId,
      message: '自动审批规则检查完成',
      data: { canAutoApprove },
    });

    return NextResponse.json({
      success: true,
      data: { canAutoApprove },
    });
  } catch (error: any) {
    logger.error({
      module: 'approval',
      action: 'check_auto_approve_error',
      requestId,
      message: '检查自动审批规则失败',
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
