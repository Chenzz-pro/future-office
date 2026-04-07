/**
 * 流程匹配工具
 * 从 EKP 读取流程配置，动态匹配节点
 */

export interface FlowMatchParams {
  approval_type: string;
  amount?: number;
  deptId: string;
}

export interface EKPFlowConfig {
  flowCode: string;
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
    // 从 EKP 获取流程定义
    const flowConfig = await this.getEKPFlowConfig(params.approval_type);

    // 动态计算审批节点
    let nodes: string[] = [];

    if (params.approval_type === "purchase") {
      // 采购审批：部门主管 -> 财务
      nodes = ["dept_manager", "finance"];
    } else if (params.approval_type === "leave") {
      // 请假审批：部门主管
      nodes = ["dept_manager"];
    } else if (params.approval_type === "reimbursement") {
      // 报销审批：金额>2000需要两级审批
      nodes = params.amount && params.amount > 2000
        ? ["dept_manager", "finance"]
        : ["dept_manager"];
    } else {
      // 默认：部门主管
      nodes = ["dept_manager"];
    }

    return {
      flowCode: flowConfig.flowCode,
      nodes,
    };
  }

  /**
   * 获取 EKP 流程配置
   */
  private async getEKPFlowConfig(approval_type: string): Promise<EKPFlowConfig> {
    // TODO: 实际封装 EKP 流程配置接口
    // 这里需要调用 EKP REST 客户端获取流程配置

    // 模拟返回数据（实际应调用 EKP 接口）
    return {
      flowCode: `FLOW_${approval_type.toUpperCase()}`,
    };
  }
}
