/**
 * 自动审批规则引擎
 * 从 agents.permission_rules 读取配置，判断是否可以自动审批
 */

export interface AutoApproveConfig {
  enable: boolean;
  allowTypes: string[];
  maxAmount: number;
  requireDeptApproval?: boolean;
}

export interface AutoApproveParams {
  approval_type: string;
  amount?: number;
  deptId?: string;
}

export class AutoApproveEngine {
  private rules: AutoApproveConfig;

  constructor(autoApproveConfig: AutoApproveConfig) {
    this.rules = autoApproveConfig;
  }

  /**
   * 判断是否可以自动审批
   */
  canAutoApprove(params: AutoApproveParams): boolean {
    // 检查自动审批是否启用
    if (!this.rules?.enable) return false;

    const { allowTypes = [], maxAmount = 99999 } = this.rules;
    const { approval_type, amount = 0 } = params;

    // 检查审批类型是否允许自动审批
    if (!allowTypes.includes(approval_type)) {
      return false;
    }

    // 检查金额是否超过限制
    if (amount > maxAmount) {
      return false;
    }

    // 可以自动审批
    return true;
  }

  /**
   * 获取规则配置
   */
  getConfig(): AutoApproveConfig {
    return this.rules;
  }
}
