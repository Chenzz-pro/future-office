/**
 * 审批 Agent
 * AI 智能审批核心引擎，支持自动发起审批、自动审批、进度跟踪等功能
 */

import { executeSkill } from '@/lib/custom-skill-executor';
import { getSkillByCode } from '@/lib/skill-query-service';
import { AutoApproveEngine } from '@/lib/approval/auto-approve-engine';
import { formatApprovalResponse } from '@/lib/approval/formatter';

export interface AgentContext {
  userId: string;
  deptId: string;
  role: string;
}

export interface PermissionRules {
  conditions: {
    requireLogin: boolean;
    requireRole: string[];
  };
  dataScope: {
    query: string;
    create: string;
    approve: string;
    autoApprove: string;
  };
  actions: {
    allow: string[];
    deny: string[];
  };
  autoApproveConfig: {
    enable: boolean;
    allowTypes: string[];
    maxAmount: number;
  };
}

export interface AgentResponse {
  code: number;
  msg: string;
  data?: any;
}

export class ApprovalAgent {
  private autoApproveEngine: AutoApproveEngine;
  private context: AgentContext;
  private permissionRules: PermissionRules;

  constructor(context: AgentContext, permissionRules: PermissionRules) {
    this.context = context;
    this.permissionRules = permissionRules;

    // 初始化自动审批引擎
    this.autoApproveEngine = new AutoApproveEngine(permissionRules.autoApproveConfig);
  }

  /**
   * 执行 AI 智能审批全流程
   */
  async execute(action: string, params: any): Promise<AgentResponse> {
    try {
      // 1. 参数校验
      if (!params) {
        throw new Error('请求参数不能为空');
      }

      // 2. 根据不同的 action 执行不同的操作
      let result: any;

      if (action === 'launch_approval') {
        // 核心功能：自然语言 → 自动发起审批
        result = await this.launchApproval(params);
      } else if (action === 'track_progress') {
        // 自动跟踪进度 + 催办
        result = await this.trackApprovalProgress(params);
      } else if (action === 'auto_approve') {
        // 执行自动审批
        result = await this.executeAutoApprove(params);
      } else {
        // 其他操作：调用对应的技能
        result = await this.executeSkillAction(action, {
          ...params,
          userId: this.context.userId,
          deptId: this.context.deptId,
        });
      }

      // 3. 内网格式化，不经过 LLM
      const reply = formatApprovalResponse(action, result);

      return {
        code: 200,
        msg: reply,
        data: result,
      };
    } catch (err: any) {
      return {
        code: 500,
        msg: err.message || '操作失败',
        data: null,
      };
    }
  }

  /**
   * 执行技能动作（使用真实的executeSkill）
   */
  private async executeSkillAction(skillCode: string, params: any) {
    try {
      // 1. 从数据库查询技能配置
      const skill = await getSkillByCode(skillCode);

      if (!skill) {
        throw new Error(`技能不存在或未启用: ${skillCode}`);
      }

      // 2. 验证技能配置
      // const validation = validateSkillConfig(skill);
      // if (!validation.valid) {
      //   throw new Error(`技能配置不完整: ${validation.errors.join(', ')}`);
      // }

      // 3. 执行技能
      const result = await executeSkill(skill, params);

      if (!result.success) {
        throw new Error(`技能执行失败: ${result.message}`);
      }

      return result;
    } catch (error: any) {
      console.error(`[ApprovalAgent] 执行技能失败: ${skillCode}`, error);
      throw error;
    }
  }

  /**
   * 核心：自然语言 → 自动发起审批
   */
  private async launchApproval(params: any) {
    // 1. 生成审批表单
    const form = await this.executeSkillAction('generate_approval_form', {
      approval_type: params.approval_type,
      userId: this.context.userId,
      deptId: this.context.deptId,
      reason: params.reason,
      amount: params.amount,
      days: params.days,
      startTime: params.startTime,
      endTime: params.endTime,
    });

    // 2. 自动匹配流程节点
    const flow = await this.executeSkillAction('match_approval_flow', {
      type: params.approval_type,
      amount: params.amount || 0,
      deptId: this.context.deptId,
    });

    // 3. 发起 EKP 审批
    const launchResult = await this.executeSkillAction('ekp_launch_approval', {
      formData: form.data,
      flowNodes: (flow.data as any)?.nodes || [],
      userId: this.context.userId,
    });

    // 4. 判断是否自动审批
    const canAutoApprove = this.autoApproveEngine.canAutoApprove({
      approval_type: params.approval_type,
      amount: params.amount || 0,
      deptId: this.context.deptId,
    });

    let autoApproveResult = null;
    if (canAutoApprove) {
      autoApproveResult = await this.executeSkillAction('ekp_auto_approve', {
        requestId: (launchResult.data as any)?.requestId,
        userId: this.context.userId,
      });
    }

    return {
      form,
      flow,
      launchResult,
      autoApproveResult,
      status: canAutoApprove ? 'auto_approved' : 'pending',
    };
  }

  /**
   * 自动跟踪进度 + 催办
   */
  private async trackApprovalProgress(params: any) {
    const progress = await this.executeSkillAction('track_approval_progress', {
      requestId: params.requestId,
      userId: this.context.userId,
    });

    // 超时自动催办
    const progressData = progress.data as any;
    if (progressData?.timeoutNodes && progressData.timeoutNodes.length > 0) {
      await this.executeSkillAction('send_approval_reminder', {
        nodes: progressData.timeoutNodes,
        userId: this.context.userId,
      });
    }

    return progressData;
  }

  /**
   * 执行自动审批
   */
  private async executeAutoApprove(params: any) {
    return await this.executeSkillAction('ekp_auto_approve', {
      requestId: params.requestId,
      userId: this.context.userId,
    });
  }

  /**
   * 获取 Agent 上下文
   */
  getContext(): AgentContext {
    return this.context;
  }

  /**
   * 获取权限规则
   */
  getPermissionRules(): PermissionRules {
    return this.permissionRules;
  }
}
