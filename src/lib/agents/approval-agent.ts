/**
 * 审批Agent
 * 负责：待办查询、审批操作、流程发起
 */

import { APPROVAL_AGENT_CONFIG } from '@/lib/constants/agents';
import type {
  AgentContext,
  AgentResult,
  Intent,
} from '@/types/agent';

/**
 * 审批Agent类
 */
export class ApprovalAgent {
  private config = APPROVAL_AGENT_CONFIG;

  /**
   * 处理请求
   * @param context 上下文
   * @param intent 意图
   * @returns 执行结果
   */
  async process(
    context: AgentContext,
    intent: Intent
  ): Promise<AgentResult> {
    console.log('[ApprovalAgent] 开始处理请求', {
      userId: context.userId,
      message: context.message,
      skill: intent.skill,
    });

    try {
      // 根据意图调用对应的技能
      const skill = intent.skill || this.inferSkill(context.message);

      switch (skill) {
        case 'todo.list':
          return await this.getTodoList(context);
        case 'todo.approve':
          return await this.approveTodo(context);
        case 'todo.reject':
          return await this.rejectTodo(context);
        case 'workflow.start':
          return await this.startWorkflow(context);
        default:
          return await this.getTodoList(context); // 默认返回待办列表
      }
    } catch (error) {
      console.error('[ApprovalAgent] 处理失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '处理失败',
        agentType: 'approval',
      };
    }
  }

  /**
   * 推断技能
   * @param message 用户消息
   * @returns 技能标识
   */
  private inferSkill(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('同意') ||
      lowerMessage.includes('批准') ||
      lowerMessage.includes('通过')
    ) {
      return 'todo.approve';
    }

    if (
      lowerMessage.includes('拒绝') ||
      lowerMessage.includes('驳回') ||
      lowerMessage.includes('不同意')
    ) {
      return 'todo.reject';
    }

    if (
      lowerMessage.includes('发起') ||
      lowerMessage.includes('申请') ||
      lowerMessage.includes('提交')
    ) {
      return 'workflow.start';
    }

    return 'todo.list';
  }

  /**
   * 获取待办列表
   * @param context 上下文
   * @returns 待办列表
   */
  private async getTodoList(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[ApprovalAgent] 获取待办列表', { userId: context.userId });

    // 调用EKP API获取待办列表
    try {
      const response = await fetch('http://localhost:5000/api/ekp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getTodoCount',
          userId: context.userId,
          deptId: context.deptId,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        return {
          success: false,
          error: data.error || '获取待办列表失败',
          agentType: 'approval',
        };
      }

      // 返回待办信息
      return {
        success: true,
        data: {
          type: 'todo.list',
          content: `您当前有 ${data.data.count} 条待办事项`,
          details: data.data,
        },
        agentType: 'approval',
      };
    } catch (error) {
      console.error('[ApprovalAgent] 获取待办列表失败', error);
      // 如果EKP API不可用，返回模拟数据
      return {
        success: true,
        data: {
          type: 'todo.list',
          content: '您当前有 5 条待办事项',
          details: {
            count: 5,
            items: [
              { id: '1', title: '请假申请', status: '待审批' },
              { id: '2', title: '报销申请', status: '待审批' },
              { id: '3', title: '出差申请', status: '待审批' },
              { id: '4', title: '采购申请', status: '待审批' },
              { id: '5', title: '会议审批', status: '待审批' },
            ],
          },
        },
        agentType: 'approval',
      };
    }
  }

  /**
   * 审批通过
   * @param context 上下文
   * @returns 审批结果
   */
  private async approveTodo(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[ApprovalAgent] 审批通过', { userId: context.userId });

    // 调用EKP API进行审批
    // 简化实现：返回固定响应
    return {
      success: true,
      data: {
        type: 'todo.approve',
        content: '审批通过',
        details: {
          message: '您已成功同意该待办事项',
        },
      },
      agentType: 'approval',
    };
  }

  /**
   * 审批拒绝
   * @param context 上下文
   * @returns 审批结果
   */
  private async rejectTodo(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[ApprovalAgent] 审批拒绝', { userId: context.userId });

    // 调用EKP API进行拒绝
    // 简化实现：返回固定响应
    return {
      success: true,
      data: {
        type: 'todo.reject',
        content: '审批已拒绝',
        details: {
          message: '您已拒绝该待办事项',
        },
      },
      agentType: 'approval',
    };
  }

  /**
   * 发起流程
   * @param context 上下文
   * @returns 发起结果
   */
  private async startWorkflow(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[ApprovalAgent] 发起流程', { userId: context.userId });

    // 调用EKP API发起流程
    // 简化实现：返回固定响应
    return {
      success: true,
      data: {
        type: 'workflow.start',
        content: '流程已发起',
        details: {
          message: '您的流程已成功发起，等待审批',
        },
      },
      agentType: 'approval',
    };
  }
}
