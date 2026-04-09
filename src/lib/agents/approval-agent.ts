/**
 * 审批智能体
 * 负责：待办查询、审批操作、流程发起
 */

import { BaseBusinessAgent } from './base-business-agent';

export class ApprovalAgent extends BaseBusinessAgent {
  constructor() {
    super('approval-agent');
  }

  /**
   * 调用技能
   * @param skillCode 技能代码
   * @param params 参数
   * @returns 执行结果
   */
  protected async callSkill(skillCode: string, params: Record<string, any>): Promise<any> {
    console.log('[ApprovalAgent] 调用技能:', skillCode, params);

    // TODO: 实际调用 EKP API 或其他业务接口
    switch (skillCode) {
      case 'todo.list':
        return this.getMyTodo(params);
      case 'todo.approve':
        return this.approveTodo(params);
      case 'todo.reject':
        return this.rejectTodo(params);
      case 'todo.started':
        return this.getMyStarted(params);
      default:
        throw new Error(`未知技能: ${skillCode}`);
    }
  }

  /**
   * 查询我的待办
   */
  private async getMyTodo(params: Record<string, any>): Promise<any> {
    // TODO: 调用 EKP 待办查询接口
    return {
      success: true,
      data: [
        { id: '1', title: '请假申请', status: 'pending', createTime: '2026-04-07 10:00' },
        { id: '2', title: '报销审批', status: 'pending', createTime: '2026-04-07 09:30' },
      ],
    };
  }

  /**
   * 审批同意
   */
  private async approveTodo(params: Record<string, any>): Promise<any> {
    // TODO: 调用 EKP 审批接口
    return {
      success: true,
      data: { message: '审批成功' },
    };
  }

  /**
   * 审批拒绝
   */
  private async rejectTodo(params: Record<string, any>): Promise<any> {
    // TODO: 调用 EKP 拒绝接口
    return {
      success: true,
      data: { message: '已拒绝' },
    };
  }

  /**
   * 查询我发起的流程
   */
  private async getMyStarted(params: Record<string, any>): Promise<any> {
    // TODO: 调用 EKP 查询发起流程接口
    return {
      success: true,
      data: [
        { id: '3', title: '我的请假申请', status: 'approved', createTime: '2026-04-06 14:00' },
      ],
    };
  }
}

export const approvalAgent = new ApprovalAgent();
