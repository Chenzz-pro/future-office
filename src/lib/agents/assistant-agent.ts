/**
 * 个人助理Agent
 * 负责：日程管理、提醒通知、个人事务
 */

import { ASSISTANT_AGENT_CONFIG } from '@/lib/constants/agents';
import type {
  AgentContext,
  AgentResult,
  Intent,
} from '@/types/agent';

/**
 * 个人助理Agent类
 */
export class AssistantAgent {
  private config = ASSISTANT_AGENT_CONFIG;

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
    console.log('[AssistantAgent] 开始处理请求', {
      userId: context.userId,
      message: context.message,
      skill: intent.skill,
    });

    try {
      const skill = intent.skill || this.inferSkill(context.message);

      switch (skill) {
        case 'schedule.list':
          return await this.getSchedule(context);
        case 'schedule.create':
          return await this.createSchedule(context);
        case 'reminder.add':
          return await this.addReminder(context);
        case 'profile.query':
          return await this.queryProfile(context);
        case 'general':
          return await this.generalChat(context);
        default:
          return await this.generalChat(context);
      }
    } catch (error) {
      console.error('[AssistantAgent] 处理失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '处理失败',
        agentType: 'assistant',
      };
    }
  }

  /**
   * 推断技能
   */
  private inferSkill(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('日程') ||
      lowerMessage.includes('安排')
    ) {
      if (
        lowerMessage.includes('添加') ||
        lowerMessage.includes('创建') ||
        lowerMessage.includes('新增')
      ) {
        return 'schedule.create';
      }
      return 'schedule.list';
    }

    if (
      lowerMessage.includes('提醒') ||
      lowerMessage.includes('闹钟')
    ) {
      return 'reminder.add';
    }

    if (
      lowerMessage.includes('个人') ||
      lowerMessage.includes('信息') ||
      lowerMessage.includes('资料')
    ) {
      return 'profile.query';
    }

    return 'general';
  }

  /**
   * 获取日程
   */
  private async getSchedule(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[AssistantAgent] 获取日程', { userId: context.userId });

    return {
      success: true,
      data: {
        type: 'schedule.list',
        content: '您今天的日程安排如下：\n- 09:00 项目周会\n- 14:00 客户会议\n- 16:00 文档编写',
        details: [
          { time: '09:00', event: '项目周会', location: '会议室A' },
          { time: '14:00', event: '客户会议', location: '会议室B' },
          { time: '16:00', event: '文档编写', location: '办公室' },
        ],
      },
      agentType: 'assistant',
    };
  }

  /**
   * 创建日程
   */
  private async createSchedule(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[AssistantAgent] 创建日程', { userId: context.userId });

    return {
      success: true,
      data: {
        type: 'schedule.create',
        content: '日程已添加',
        details: {
          message: '您的日程已成功添加',
        },
      },
      agentType: 'assistant',
    };
  }

  /**
   * 添加提醒
   */
  private async addReminder(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[AssistantAgent] 添加提醒', { userId: context.userId });

    return {
      success: true,
      data: {
        type: 'reminder.add',
        content: '提醒已设置',
        details: {
          message: '您的提醒已成功设置',
        },
      },
      agentType: 'assistant',
    };
  }

  /**
   * 查询个人资料
   */
  private async queryProfile(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[AssistantAgent] 查询个人资料', { userId: context.userId });

    return {
      success: true,
      data: {
        type: 'profile.query',
        content: '您的个人资料信息',
        details: {
          message: '这是您的个人资料信息',
        },
      },
      agentType: 'assistant',
    };
  }

  /**
   * 通用对话
   */
  private async generalChat(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[AssistantAgent] 通用对话', { userId: context.userId });

    // 调用大模型生成响应
    // 简化实现：返回固定响应
    return {
      success: true,
      data: {
        type: 'general',
        content: `我收到了您的消息："${context.message}"，正在为您处理...`,
      },
      agentType: 'assistant',
    };
  }
}
