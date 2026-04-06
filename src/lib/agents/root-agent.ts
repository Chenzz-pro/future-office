/**
 * RootAgent（统筹智能体）
 * 负责：意图识别、权限校验、任务分发、结果汇总
 */

import { getLLMClient } from '@/lib/llm/llm-client';
import { ROOT_AGENT_CONFIG, AGENT_MAP } from '@/lib/constants/agents';
import type {
  AgentContext,
  AgentResult,
  Intent,
} from '@/types/agent';

/**
 * RootAgent类
 */
export class RootAgent {
  private config = ROOT_AGENT_CONFIG;

  /**
   * 处理用户请求
   * @param context 上下文
   * @returns 执行结果
   */
  async process(context: AgentContext): Promise<AgentResult> {
    console.log('[RootAgent] 开始处理请求', {
      userId: context.userId,
      message: context.message,
      role: context.role,
    });

    try {
      // 步骤1：意图识别
      const intent = await this.recognizeIntent(context);
      console.log('[RootAgent] 意图识别结果', intent);

      // 步骤2：权限校验
      const hasPermission = await this.checkPermission(context, intent);
      if (!hasPermission) {
        console.warn('[RootAgent] 权限校验失败，拒绝请求');
        return {
          success: false,
          error: '您没有权限执行此操作',
          agentType: 'root',
        };
      }

      // 步骤3：任务分发
      console.log('[RootAgent] 准备分发任务', { intent });
      const result = await this.dispatch(context, intent);
      console.log('[RootAgent] 任务分发结果', {
        success: result.success,
        agentType: result.agentType,
        hasData: !!result.data,
        error: result.error,
      });

      // 步骤4：结果汇总
      const summarizedResult = this.summarize(result);
      console.log('[RootAgent] 结果汇总完成', {
        success: summarizedResult.success,
        agentType: summarizedResult.agentType,
        hasData: !!summarizedResult.data,
      });
      return summarizedResult;
    } catch (error) {
      console.error('[RootAgent] 处理请求失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '处理失败',
        agentType: 'root',
      };
    }
  }

  /**
   * 意图识别
   * @param context 上下文
   * @returns 意图
   */
  private async recognizeIntent(context: AgentContext): Promise<Intent> {
    const llmClient = getLLMClient();

    // 调用LLM进行意图识别
    const response = await llmClient.recognizeIntent({
      message: context.message,
      userId: context.userId,
      deptId: context.deptId,
      role: context.role,
      conversationHistory: context.conversationHistory,
    });

    // 验证意图是否有效
    // 注意：只允许 dispatch 方法中处理的 agentType，不包括 'root'
    const validAgentTypes = ['approval', 'meeting', 'data', 'assistant'];
    if (!validAgentTypes.includes(response.agentType)) {
      console.warn('[RootAgent] 无效的agentType，使用默认值', response.agentType);
      response.agentType = 'assistant';
    }

    return {
      agentType: response.agentType as any,
      skill: response.skill,
      confidence: response.confidence,
      reasoning: response.reasoning,
    };
  }

  /**
   * 权限校验
   * @param context 上下文
   * @param intent 意图
   * @returns 是否有权限
   */
  private async checkPermission(
    context: AgentContext,
    intent: Intent
  ): Promise<boolean> {
    // 基础权限检查：确保userId存在
    if (!context.userId) {
      console.error('[RootAgent] 权限校验失败：userId为空');
      return false;
    }

    // 根据意图类型进行特定权限检查
    switch (intent.agentType) {
      case 'approval':
        // 审批权限检查
        return await this.checkApprovalPermission(context);
      case 'meeting':
        // 会议权限检查
        return await this.checkMeetingPermission(context);
      case 'data':
        // 数据权限检查
        return await this.checkDataPermission(context);
      case 'assistant':
        // 个人助理权限检查（所有用户都有）
        return true;
      default:
        return true;
    }
  }

  /**
   * 审批权限检查
   */
  private async checkApprovalPermission(
    context: AgentContext
  ): Promise<boolean> {
    console.log('[RootAgent] 检查审批权限', { userId: context.userId });
    // 检查用户是否有审批权限
    // 这里可以查询数据库或调用权限服务
    // 简化实现：所有用户都有审批权限
    return true;
  }

  /**
   * 会议权限检查
   */
  private async checkMeetingPermission(
    context: AgentContext
  ): Promise<boolean> {
    console.log('[RootAgent] 检查会议权限', { userId: context.userId });
    // 检查用户是否有会议管理权限
    // 简化实现：所有用户都有会议权限
    return true;
  }

  /**
   * 数据权限检查
   */
  private async checkDataPermission(
    context: AgentContext
  ): Promise<boolean> {
    console.log('[RootAgent] 检查数据权限', { userId: context.userId });
    // 检查用户是否有数据查询权限
    // 简化实现：所有用户都有数据查询权限
    return true;
  }

  /**
   * 任务分发
   * @param context 上下文
   * @param intent 意图
   * @returns 业务Agent执行结果
   */
  private async dispatch(
    context: AgentContext,
    intent: Intent
  ): Promise<AgentResult> {
    // 根据意图选择对应的业务Agent
    const agentType = intent.agentType;

    console.log('[RootAgent] 开始任务分发', { agentType });

    // 这里需要动态加载对应的Agent
    // 简化实现：直接调用
    switch (agentType) {
      case 'approval': {
        const { ApprovalAgent } = await import('@/lib/agents/approval-agent');
        const approvalAgent = new ApprovalAgent();
        return await approvalAgent.process(context, intent);
      }
      case 'meeting': {
        const { MeetingAgent } = await import('@/lib/agents/meeting-agent');
        const meetingAgent = new MeetingAgent();
        return await meetingAgent.process(context, intent);
      }
      case 'data': {
        const { DataAgent } = await import('@/lib/agents/data-agent');
        const dataAgent = new DataAgent();
        return await dataAgent.process(context, intent);
      }
      case 'assistant': {
        const { AssistantAgent } = await import('@/lib/agents/assistant-agent');
        const assistantAgent = new AssistantAgent();
        return await assistantAgent.process(context, intent);
      }
      default:
        return {
          success: false,
          error: '未找到对应的业务Agent',
          agentType: 'root',
        };
    }
  }

  /**
   * 结果汇总
   * @param result 业务Agent执行结果
   * @returns 汇总后的结果
   */
  private summarize(result: AgentResult): AgentResult {
    // 可以在这里对结果进行格式化、汇总等操作
    // 简化实现：直接返回
    console.log('[RootAgent] 结果汇总', result);
    return result;
  }
}

// 导出单例
export const rootAgent = new RootAgent();
