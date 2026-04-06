/**
 * LLM客户端工具类
 * 用于调用大模型进行意图识别和生成
 * 未来将接入oneAPI
 */

import type {
  LLMResponse,
  IntentRequest,
  IntentResponse,
} from '@/types/agent';

/**
 * LLM客户端类
 */
export class LLMClient {
  private apiKey: string;
  private apiUrl: string;
  private modelName: string;

  constructor(apiKey: string, apiUrl: string, modelName: string = 'gpt-4') {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.modelName = modelName;
  }

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

    // 这里将来会接入oneAPI
    // 暂时使用规则引擎简化实现
    return this.ruleBasedIntent(request.message);
  }

  /**
   * 基于规则的意图识别（临时实现）
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
   * @returns LLM响应
   */
  async generateResponse(prompt: string): Promise<LLMResponse> {
    console.log('[LLMClient] 生成响应');

    // 这里将来会接入oneAPI
    // 暂时返回固定响应
    return {
      success: true,
      content: '我收到了您的请求，正在处理中...',
    };
  }

  /**
   * 检查是否已配置
   * @returns 是否已配置
   */
  isConfigured(): boolean {
    return !!this.apiKey;
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
    // 从环境变量或配置中获取
    const apiKey = process.env.ONEAPI_KEY || '';
    const apiUrl = process.env.ONEAPI_URL || '';
    const modelName = process.env.ONEAPI_MODEL || 'gpt-4';

    if (!apiKey) {
      console.warn('[LLMClient] oneAPI配置未找到，使用规则引擎');
    }

    llmClient = new LLMClient(apiKey, apiUrl, modelName);
  }
  return llmClient;
}

/**
 * 重置LLM客户端（用于测试）
 */
export function resetLLMClient(): void {
  llmClient = null;
}
