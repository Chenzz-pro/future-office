/**
 * 会议Agent
 * 负责：会议查询、会议预定、会议通知
 */

import { MEETING_AGENT_CONFIG } from '@/lib/constants/agents';
import type {
  AgentContext,
  AgentResult,
  Intent,
} from '@/types/agent';

/**
 * 会议Agent类
 */
export class MeetingAgent {
  private config = MEETING_AGENT_CONFIG;

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
    console.log('[MeetingAgent] 开始处理请求', {
      userId: context.userId,
      message: context.message,
      skill: intent.skill,
    });

    try {
      const skill = intent.skill || this.inferSkill(context.message);

      switch (skill) {
        case 'meeting.list':
          return await this.getMeetingList(context);
        case 'meeting.create':
          return await this.createMeeting(context);
        case 'meeting.update':
          return await this.updateMeeting(context);
        case 'meeting.cancel':
          return await this.cancelMeeting(context);
        default:
          return await this.getMeetingList(context);
      }
    } catch (error) {
      console.error('[MeetingAgent] 处理失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '处理失败',
        agentType: 'meeting',
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
      lowerMessage.includes('预定') ||
      lowerMessage.includes('预约') ||
      lowerMessage.includes('创建') ||
      lowerMessage.includes('新增')
    ) {
      return 'meeting.create';
    }

    if (
      lowerMessage.includes('更新') ||
      lowerMessage.includes('修改') ||
      lowerMessage.includes('更改')
    ) {
      return 'meeting.update';
    }

    if (
      lowerMessage.includes('取消') ||
      lowerMessage.includes('删除') ||
      lowerMessage.includes('撤销')
    ) {
      return 'meeting.cancel';
    }

    return 'meeting.list';
  }

  /**
   * 获取会议列表
   */
  private async getMeetingList(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[MeetingAgent] 获取会议列表', { userId: context.userId });

    // 调用会议API
    // 简化实现：返回固定响应
    return {
      success: true,
      data: {
        type: 'meeting.list',
        content: '您有3个即将开始的会议',
        details: [
          { id: '1', title: '项目周会', time: '2024-01-15 10:00', location: '会议室A' },
          { id: '2', title: '部门例会', time: '2024-01-16 14:00', location: '会议室B' },
          { id: '3', title: '客户对接会', time: '2024-01-17 09:30', location: '会议室C' },
        ],
      },
      agentType: 'meeting',
    };
  }

  /**
   * 创建会议
   */
  private async createMeeting(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[MeetingAgent] 创建会议', { userId: context.userId });

    // 调用会议API
    // 简化实现：返回固定响应
    return {
      success: true,
      data: {
        type: 'meeting.create',
        content: '会议已创建',
        details: {
          message: '您的会议已成功创建',
          meetingId: crypto.randomUUID(),
        },
      },
      agentType: 'meeting',
    };
  }

  /**
   * 更新会议
   */
  private async updateMeeting(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[MeetingAgent] 更新会议', { userId: context.userId });

    return {
      success: true,
      data: {
        type: 'meeting.update',
        content: '会议已更新',
        details: {
          message: '您的会议信息已成功更新',
        },
      },
      agentType: 'meeting',
    };
  }

  /**
   * 取消会议
   */
  private async cancelMeeting(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[MeetingAgent] 取消会议', { userId: context.userId });

    return {
      success: true,
      data: {
        type: 'meeting.cancel',
        content: '会议已取消',
        details: {
          message: '您的会议已成功取消',
        },
      },
      agentType: 'meeting',
    };
  }
}
