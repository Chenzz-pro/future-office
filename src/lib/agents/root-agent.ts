/**
 * RootAgent（根智能体）
 * 新架构：唯一使用LLM的Agent，负责意图识别、权限拦截、话术润色
 */

import { oneAPIManager } from '@/lib/oneapi';
import { agentRepository } from '@/lib/database/repositories/agent.repository';
import type {
  IntentResult,
  AgentResponse,
  UserContext,
  AgentConfig,
} from '@/lib/types/agent';

export class RootAgent {
  private systemPrompt: string;
  private availableAgents: Map<string, AgentConfig> = new Map();

  constructor() {
    this.systemPrompt = this.buildSystemPrompt();
  }

  /**
   * 构建系统提示词
   */
  private buildSystemPrompt(): string {
    return `你是企业OA系统的智能路由助手，负责理解用户意图并转发给相应的业务Agent。

你的职责：
1. 识别用户意图（审批/会议/数据/个人助理）
2. 提取关键参数
3. 返回结构化的意图识别结果

可用的业务Agent：
- approval-agent（审批智能体）：待办查询、审批操作、流程发起
- meeting-agent（会议智能体）：会议查询、预定、更新、取消
- data-agent（数据智能体）：表单查询、统计分析、报表生成
- assistant-agent（助理智能体）：日程管理、提醒通知、个人事务

返回格式（必须是严格的JSON格式）：
\`\`\`json
{
  "agentId": "agent-id",
  "action": "action-name",
  "context": {
    "userId": "user-id",
    "deptId": "dept-id",
    "params": {
      "key": "value"
    }
  }
}
\`\`\`

示例：
用户："查询我的待办"
返回：
\`\`\`json
{
  "agentId": "approval-agent",
  "action": "get_my_todo",
  "context": {
    "userId": "user-id",
    "params": {}
  }
}
\`\`\`

用户："明天下午2点预定会议室"
返回：
\`\`\`json
{
  "agentId": "meeting-agent",
  "action": "create_meeting",
  "context": {
    "userId": "user-id",
    "params": {
      "date": "tomorrow",
      "time": "14:00"
    }
  }
}
\`\`\`

重要规则：
- 一定要返回纯JSON格式，不要有任何其他文本
- 如果无法识别意图，返回 agentId: "unknown"
- 不要添加任何解释或说明`;
  }

  /**
   * 初始化（加载可用的业务Agent）
   */
  async initialize(): Promise<void> {
    console.log('[RootAgent] 开始初始化...');
    
    try {
      // 加载所有业务Agent
      const agents = await agentRepository.getBusinessAgents();
      this.availableAgents.clear();
      
      for (const agent of agents) {
        this.availableAgents.set(agent.type, agent);
      }
      
      console.log('[RootAgent] 初始化完成，已加载业务Agent:', this.availableAgents.size);
    } catch (error) {
      console.error('[RootAgent] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 意图识别
   * @param userInput 用户输入
   * @param userContext 用户上下文
   * @returns 意图识别结果
   */
  async recognizeIntent(userInput: string, userContext: UserContext): Promise<IntentResult> {
    console.log('[RootAgent] 开始意图识别:', {
      userInput: userInput.substring(0, 100),
      userId: userContext.userId,
    });

    if (!oneAPIManager.isEnabled()) {
      throw new Error('oneAPI未配置，无法进行意图识别');
    }

    // 构建消息
    const messages = [
      {
        role: 'system' as const,
        content: this.systemPrompt,
      },
      {
        role: 'user' as const,
        content: `用户信息：\nuserId: ${userContext.userId}\ndeptId: ${userContext.deptId || '未设置'}\nrole: ${userContext.role || '未设置'}\n\n用户输入：\n${userInput}`,
      },
    ];

    try {
      // 调用LLM进行意图识别
      const response = await oneAPIManager.chat(messages, {
        temperature: 0.3, // 降低温度，提高确定性
        maxTokens: 500,
      });

      console.log('[RootAgent] LLM响应:', response);

      // 解析JSON响应
      const intentResult = this.parseIntentResponse(response);
      
      // 填充用户上下文
      intentResult.context.userId = userContext.userId;
      if (userContext.deptId) {
        intentResult.context.deptId = userContext.deptId;
      }

      console.log('[RootAgent] 意图识别成功:', intentResult);
      return intentResult;
    } catch (error) {
      console.error('[RootAgent] 意图识别失败:', error);
      throw error;
    }
  }

  /**
   * 解析意图识别响应
   * @param response LLM响应
   * @returns 意图识别结果
   */
  private parseIntentResponse(response: string): IntentResult {
    try {
      // 尝试提取JSON（处理可能的markdown格式）
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('无法从响应中提取JSON');
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const result = JSON.parse(jsonText) as IntentResult;

      // 验证必需字段
      if (!result.agentId || !result.action || !result.context) {
        throw new Error('意图识别结果缺少必需字段');
      }

      return result;
    } catch (error) {
      console.error('[RootAgent] 解析响应失败:', error);
      // 返回默认值（未知意图）
      return {
        agentId: 'unknown',
        action: 'unknown',
        context: {
          userId: '',
          params: {},
        },
      };
    }
  }

  /**
   * 权限拦截
   * @param userContext 用户上下文
   * @param intentResult 意图识别结果
   * @returns 是否有权限
   */
  async checkPermission(userContext: UserContext, intentResult: IntentResult): Promise<boolean> {
    console.log('[RootAgent] 开始权限检查:', {
      userId: userContext.userId,
      role: userContext.role,
      agentId: intentResult.agentId,
      action: intentResult.action,
    });

    // 1. 检查Agent是否存在且启用
    const agent = this.availableAgents.get(intentResult.agentId);
    if (!agent || !agent.enabled) {
      console.warn('[RootAgent] Agent不存在或未启用:', intentResult.agentId);
      return false;
    }

    // 2. 检查是否有权限规则配置
    if (!agent.permissionRules || agent.permissionRules.length === 0) {
      console.log('[RootAgent] 无权限规则，默认允许访问');
      return true;
    }

    // 3. 执行权限规则校验
    // TODO: 实现具体的权限规则校验逻辑（在阶段三：规则引擎中实现）
    console.log('[RootAgent] 权限规则校验（待规则引擎实现）');

    // 临时：默认允许访问（后续由规则引擎实现）
    return true;
  }

  /**
   * 话术润色
   * @param businessResponse 业务Agent返回的结果
   * @returns 润色后的文本
   */
  async polishResponse(businessResponse: AgentResponse): Promise<string> {
    console.log('[RootAgent] 开始话术润色:', {
      code: businessResponse.code,
      msg: businessResponse.msg,
    });

    try {
      // 如果业务Agent返回错误，直接返回错误消息
      if (businessResponse.code !== '200') {
        return businessResponse.msg;
      }

      // 如果业务Agent返回的data已经是文本，直接返回
      if (typeof businessResponse.data === 'string') {
        return businessResponse.data;
      }

      // 如果业务Agent返回的是结构化数据，使用LLM润色
      if (typeof businessResponse.data === 'object') {
        if (!oneAPIManager.isEnabled()) {
          // 如果oneAPI未配置，直接返回JSON字符串
          return JSON.stringify(businessResponse.data, null, 2);
        }

        const messages = [
          {
            role: 'system' as const,
            content: '你是一个友好的助手，负责将结构化数据转换为友好的自然语言文本。要求：简洁、清晰、易懂。',
          },
          {
            role: 'user' as const,
            content: `请将以下数据转换为友好的自然语言文本：\n\`\`\`json\n${JSON.stringify(businessResponse.data, null, 2)}\n\`\`\``,
          },
        ];

        const polished = await oneAPIManager.chat(messages, {
          temperature: 0.7,
          maxTokens: 300,
        });

        return polished;
      }

      // 其他情况，返回msg
      return businessResponse.msg;
    } catch (error) {
      console.error('[RootAgent] 话术润色失败:', error);
      // 润色失败，返回原始消息
      return businessResponse.msg;
    }
  }

  /**
   * 完整的处理流程
   * @param userInput 用户输入
   * @param userContext 用户上下文
   * @returns 最终结果
   */
  async process(userInput: string, userContext: UserContext): Promise<{
    intent: IntentResult;
    permissionGranted: boolean;
    message?: string;
  }> {
    try {
      // 1. 意图识别
      const intent = await this.recognizeIntent(userInput, userContext);

      // 2. 权限检查
      const permissionGranted = await this.checkPermission(userContext, intent);

      return {
        intent,
        permissionGranted,
      };
    } catch (error) {
      console.error('[RootAgent] 处理失败:', error);
      throw error;
    }
  }
}

// 导出单例
export const rootAgent = new RootAgent();
