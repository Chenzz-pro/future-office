import { NextRequest, NextResponse } from 'next/server';
import { FlowMatcher } from '@/lib/approval/flow-matcher';
import { logger, generateRequestId } from '@/lib/utils/logger';
import { BusinessErrors } from '@/lib/utils/error-handler';

/**
 * 匹配审批流程接口
 * 技能代码: match_approval_flow
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    logger.info({
      module: 'approval',
      action: 'match_flow',
      requestId,
      message: '匹配审批流程请求',
      data: { path: '/api/approval/flow/match' },
    });

    // 解析请求参数
    const body = await request.json();
    const { approval_type, amount, deptId } = body;

    // 参数校验
    if (!approval_type || !deptId) {
      throw BusinessErrors.invalidParams({
        missing: ['approval_type', 'deptId'],
      });
    }

    // 匹配流程
    const matcher = new FlowMatcher();
    const flow = await matcher.matchFlow({
      approval_type,
      amount,
      deptId,
    });

    logger.info({
      module: 'approval',
      action: 'match_flow_success',
      requestId,
      message: '流程匹配成功',
      data: { flowCode: flow.flowCode, nodes: flow.nodes },
    });

    return NextResponse.json({
      success: true,
      data: flow,
    });
  } catch (error: any) {
    logger.error({
      module: 'approval',
      action: 'match_flow_error',
      requestId,
      message: '匹配审批流程失败',
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
