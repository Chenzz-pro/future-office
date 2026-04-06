/**
 * 数据Agent
 * 负责：表单查询、统计分析、报表生成
 */

import { DATA_AGENT_CONFIG } from '@/lib/constants/agents';
import type {
  AgentContext,
  AgentResult,
  Intent,
} from '@/types/agent';

/**
 * 数据Agent类
 */
export class DataAgent {
  private config = DATA_AGENT_CONFIG;

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
    console.log('[DataAgent] 开始处理请求', {
      userId: context.userId,
      message: context.message,
      skill: intent.skill,
    });

    try {
      const skill = intent.skill || this.inferSkill(context.message);

      switch (skill) {
        case 'form.list':
          return await this.getFormList(context);
        case 'form.query':
          return await this.queryForm(context);
        case 'report.generate':
          return await this.generateReport(context);
        case 'statistic.summary':
          return await this.getStatisticSummary(context);
        default:
          return await this.getFormList(context);
      }
    } catch (error) {
      console.error('[DataAgent] 处理失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '处理失败',
        agentType: 'data',
      };
    }
  }

  /**
   * 推断技能
   */
  private inferSkill(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('生成') &&
      lowerMessage.includes('报表')
    ) {
      return 'report.generate';
    }

    if (lowerMessage.includes('统计') || lowerMessage.includes('汇总')) {
      return 'statistic.summary';
    }

    if (
      lowerMessage.includes('查询') ||
      lowerMessage.includes('搜索') ||
      lowerMessage.includes('查看')
    ) {
      return 'form.query';
    }

    return 'form.list';
  }

  /**
   * 获取表单列表
   */
  private async getFormList(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[DataAgent] 获取表单列表', { userId: context.userId });

    // 调用表单API
    // 简化实现：返回固定响应
    return {
      success: true,
      data: {
        type: 'form.list',
        content: '您有5个可用表单',
        details: [
          { id: '1', name: '请假申请表', status: '启用' },
          { id: '2', name: '报销申请表', status: '启用' },
          { id: '3', name: '出差申请表', status: '启用' },
          { id: '4', name: '采购申请表', status: '启用' },
          { id: '5', name: '会议申请表', status: '启用' },
        ],
      },
      agentType: 'data',
    };
  }

  /**
   * 查询表单
   */
  private async queryForm(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[DataAgent] 查询表单', { userId: context.userId });

    return {
      success: true,
      data: {
        type: 'form.query',
        content: '查询结果',
        details: {
          message: '根据您的查询条件，找到以下结果',
        },
      },
      agentType: 'data',
    };
  }

  /**
   * 生成报表
   */
  private async generateReport(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[DataAgent] 生成报表', { userId: context.userId });

    return {
      success: true,
      data: {
        type: 'report.generate',
        content: '报表已生成',
        details: {
          message: '您的报表已成功生成',
          reportId: crypto.randomUUID(),
        },
      },
      agentType: 'data',
    };
  }

  /**
   * 获取统计汇总
   */
  private async getStatisticSummary(
    context: AgentContext
  ): Promise<AgentResult> {
    console.log('[DataAgent] 获取统计汇总', { userId: context.userId });

    return {
      success: true,
      data: {
        type: 'statistic.summary',
        content: '统计汇总',
        details: {
          message: '以下是您的数据统计汇总',
          summary: {
            totalForms: 5,
            pendingApprovals: 3,
            completedTasks: 10,
          },
        },
      },
      agentType: 'data',
    };
  }
}
