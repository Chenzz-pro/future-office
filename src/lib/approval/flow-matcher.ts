/**
 * 流程匹配工具
 * 从 EKP 读取流程配置，动态匹配节点
 */

import { ekpApprovalClient, ApprovalType, ApprovalFlow } from '../ekp-approval-client';

export interface FlowMatchParams {
  approval_type: string;
  amount?: number;
  deptId: string;
}

export interface FlowMatchResult {
  flowCode: string;
  nodes: string[];
}

export class FlowMatcher {
  /**
   * 动态匹配审批流程节点
   */
  async matchFlow(params: FlowMatchParams): Promise<FlowMatchResult> {
    // 将字符串类型转换为枚举
    const type = this.parseApprovalType(params.approval_type);

    // 调用EKP审批客户端匹配流程
    const flow: ApprovalFlow = await ekpApprovalClient.matchFlow(
      type,
      params.amount || 0,
      params.deptId
    );

    // 返回流程节点
    return {
      flowCode: flow.flowId,
      nodes: flow.nodes.map((node: any) => node.nodeId),
    };
  }

  /**
   * 解析审批类型
   */
  private parseApprovalType(type: string): ApprovalType {
    const typeMap: Record<string, ApprovalType> = {
      'leave': ApprovalType.LEAVE,
      'reimbursement': ApprovalType.REIMBURSEMENT,
      'purchase': ApprovalType.PURCHASE,
      'expense_report': ApprovalType.EXPENSE_REPORT,
    };

    return typeMap[type] || ApprovalType.LEAVE;
  }
}
