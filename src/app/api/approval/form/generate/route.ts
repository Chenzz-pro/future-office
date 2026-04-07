import { NextRequest, NextResponse } from 'next/server';
import { FormGenerator } from '@/lib/approval/form-generator';
import { logger, generateRequestId } from '@/lib/utils/logger';
import { BusinessErrors } from '@/lib/utils/error-handler';

/**
 * 生成审批表单接口
 * 技能代码: generate_approval_form
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    logger.info({
      module: 'approval',
      action: 'generate_form',
      requestId,
      message: '生成审批表单请求',
      data: { path: '/api/approval/form/generate' },
    });

    // 解析请求参数
    const body = await request.json();
    const { approval_type, userId, deptId, reason, amount, days, startTime, endTime } = body;

    // 参数校验
    if (!approval_type || !userId || !deptId) {
      throw BusinessErrors.invalidParams({
        missing: ['approval_type', 'userId', 'deptId'],
      });
    }

    // 生成表单
    const generator = new FormGenerator();
    const form = await generator.generateForm({
      approval_type,
      userId,
      deptId,
      reason,
      amount,
      days,
      startTime,
      endTime,
    });

    logger.info({
      module: 'approval',
      action: 'generate_form_success',
      requestId,
      message: '表单生成成功',
      data: { templateId: form.templateId },
    });

    return NextResponse.json({
      success: true,
      data: form,
    });
  } catch (error: any) {
    logger.error({
      module: 'approval',
      action: 'generate_form_error',
      requestId,
      message: '生成审批表单失败',
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
