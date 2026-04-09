import { NextRequest, NextResponse } from 'next/server';
import { logger, generateRequestId } from '@/lib/utils/logger';
import { BusinessErrors } from '@/lib/utils/error-handler';
import { ekpApprovalClient, ApprovalType, ApprovalFormData, ApprovalFlowNode } from '@/lib/ekp-approval-client';

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

    // 转换数据格式
    const approvalFormData: ApprovalFormData = {
      templateId: formData.templateId || 'FORM_DEFAULT',
      subject: formData.subject || '审批申请',
      formValues: formData.formData || {},
      applicantId: userId,
      deptId: formData.deptId || '',
    };

    const approvalFlowNodes: ApprovalFlowNode[] = flowNodes.map((node: string) => ({
      nodeId: node,
      nodeName: node,
      nodeType: 'dept_manager',
    }));

    // 调用EKP审批客户端发起审批
    const launchResult = await ekpApprovalClient.launchApproval(
      approvalFormData,
      approvalFlowNodes,
      userId
    );

    logger.info({
      module: 'approval',
      action: 'launch_approval_success',
      requestId,
      message: 'EKP审批发起成功',
      data: { requestId: launchResult.requestId, status: launchResult.status },
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
