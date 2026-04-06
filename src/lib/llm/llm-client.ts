/**
 * LLM客户端工具类
 * 用于调用大模型进行意图识别和生成
 * 支持oneAPI集成
 */

import { oneAPIManager, type OneAPIMessage } from '@/lib/oneapi';
import type {
  LLMResponse,
  IntentRequest,
  IntentResponse,
} from '@/types/agent';

/**
 * LLM客户端类
 */
export class LLMClient {
  /**
   * 意图识别
   * @param request 意图识别请求
   * @returns 意图识别结果
   */
  async recognizeIntent(request: IntentRequest): Promise<IntentResponse> {
    console.log('[LLMClient] 开始意图识别', {
      message: request.message,
      userId: request.userId,
    });

    // 如果oneAPI已启用，使用LLM进行意图识别
    if (oneAPIManager.isEnabled()) {
      return this.llmBasedIntent(request);
    }

    // 否则使用规则引擎（降级方案）
    console.log('[LLMClient] oneAPI未启用，使用规则引擎');
    return this.ruleBasedIntent(request.message);
  }

  /**
   * 基于LLM的意图识别
   * @param request 意图识别请求
   * @returns 意图识别结果
   */
  private async llmBasedIntent(request: IntentRequest): Promise<IntentResponse> {
    try {
      const systemPrompt = `你是企业OA系统的意图识别助手。请根据用户的消息识别用户意图，并返回以下Agent类型之一：
- approval: 审批智能体（负责待办审批、流程发起、审批查询）
- meeting: 会议智能体（负责会议查询、会议预定、会议通知）
- data: 数据智能体（负责表单查询、统计分析、报表生成）
- assistant: 个人助理智能体（负责日程管理、提醒通知、个人事务、通用对话）

请以JSON格式返回，格式如下：
{
  "agentType": "approval",
  "confidence": 0.9,
  "reasoning": "识别到审批相关关键词"
}`;

      const messages: OneAPIMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: request.message },
      ];

      const response = await oneAPIManager.chat(messages, {
        temperature: 0.3,
        maxTokens: 500,
      });

      // 尝试解析JSON响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log('[LLMClient] LLM意图识别结果:', result);
        return result;
      }

      // 解析失败，使用规则引擎
      console.log('[LLMClient] LLM响应解析失败，降级到规则引擎');
      return this.ruleBasedIntent(request.message);
    } catch (error) {
      console.error('[LLMClient] LLM意图识别失败，降级到规则引擎:', error);
      return this.ruleBasedIntent(request.message);
    }
  }

  /**
   * 基于规则的意图识别（降级方案）
   * @param message 用户消息
   * @returns 意图识别结果
   */
  private ruleBasedIntent(message: string): IntentResponse {
    console.log('[LLMClient] 使用规则引擎进行意图识别');
    const lowerMessage = message.toLowerCase();

    // 审批相关
    if (
      lowerMessage.includes('待办') ||
      lowerMessage.includes('审批') ||
      lowerMessage.includes('流程') ||
      lowerMessage.includes('同意') ||
      lowerMessage.includes('拒绝')
    ) {
      console.log('[LLMClient] 识别为审批意图');
      return {
        agentType: 'approval',
        confidence: 0.9,
        reasoning: '识别到审批相关关键词',
      };
    }

    // 会议相关
    if (
      lowerMessage.includes('会议') ||
      lowerMessage.includes('预定') ||
      lowerMessage.includes('预约') ||
      lowerMessage.includes('会议室')
    ) {
      console.log('[LLMClient] 识别为会议意图');
      return {
        agentType: 'meeting',
        confidence: 0.9,
        reasoning: '识别到会议相关关键词',
      };
    }

    // 数据查询相关
    if (
      lowerMessage.includes('查询') ||
      lowerMessage.includes('统计') ||
      lowerMessage.includes('报表') ||
      lowerMessage.includes('数据') ||
      lowerMessage.includes('表单')
    ) {
      console.log('[LLMClient] 识别为数据意图');
      return {
        agentType: 'data',
        confidence: 0.85,
        reasoning: '识别到数据查询相关关键词',
      };
    }

    // 个人助理相关
    if (
      lowerMessage.includes('日程') ||
      lowerMessage.includes('提醒') ||
      lowerMessage.includes('个人') ||
      lowerMessage.includes('我的') ||
      lowerMessage.includes('安排')
    ) {
      console.log('[LLMClient] 识别为个人助理意图');
      return {
        agentType: 'assistant',
        confidence: 0.8,
        reasoning: '识别到个人助理相关关键词',
      };
    }

    // 默认返回个人助理
    console.log('[LLMClient] 未识别到明确意图，默认使用个人助理');
    return {
      agentType: 'assistant',
      confidence: 0.5,
      reasoning: '未识别到明确意图，默认使用个人助理',
    };
  }

  /**
   * 生成响应
   * @param prompt 提示词
   * @param systemPrompt 系统提示词（可选）
   * @returns LLM响应
   */
  async generateResponse(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    console.log('[LLMClient] 生成响应');

    // 如果oneAPI已启用，使用LLM生成响应
    if (oneAPIManager.isEnabled()) {
      try {
        const messages: OneAPIMessage[] = [];

        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt });
        }

        messages.push({ role: 'user', content: prompt });

        const content = await oneAPIManager.chat(messages, {
          temperature: 0.7,
          maxTokens: 2000,
        });

        return {
          success: true,
          content,
        };
      } catch (error) {
        console.error('[LLMClient] LLM生成响应失败:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : '生成响应失败',
        };
      }
    }

    // 否则返回固定响应
    console.log('[LLMClient] oneAPI未启用，返回固定响应');
    return {
      success: true,
      content: '我收到了您的请求，正在处理中...',
    };
  }

  /**
   * 流式生成响应
   * @param prompt 提示词
   * @param onChunk 接收数据块的回调
   * @param systemPrompt 系统提示词（可选）
   */
  async generateResponseStream(
    prompt: string,
    onChunk: (chunk: string) => void,
    systemPrompt?: string
  ): Promise<void> {
    console.log('[LLMClient] 流式生成响应');

    // 如果oneAPI已启用，使用LLM流式生成响应
    if (oneAPIManager.isEnabled()) {
      try {
        const messages: OneAPIMessage[] = [];

        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt });
        }

        messages.push({ role: 'user', content: prompt });

        await oneAPIManager.chatStream(messages, onChunk, {
          temperature: 0.7,
          maxTokens: 2000,
        });
      } catch (error) {
        console.error('[LLMClient] LLM流式生成响应失败:', error);
        onChunk('抱歉，生成响应时出现错误。');
      }
    } else {
      // 否则返回固定响应
      console.log('[LLMClient] oneAPI未启用，返回固定响应');
      onChunk('我收到了您的请求，正在处理中...');
    }
  }

  /**
   * 检查是否已配置
   * @returns 是否已配置
   */
  isConfigured(): boolean {
    return oneAPIManager.isEnabled();
  }
}

// 导出单例
let llmClient: LLMClient | null = null;

/**
 * 获取LLM客户端单例
 * @returns LLM客户端实例
 */
export function getLLMClient(): LLMClient {
  if (!llmClient) {
    llmClient = new LLMClient();
  }
  return llmClient;
}

/**
 * 重置LLM客户端（用于测试）
 */
export function resetLLMClient(): void {
  llmClient = null;
}
