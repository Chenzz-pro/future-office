/**
 * RootAgent（根智能体）
 * 新架构：唯一使用LLM的Agent，负责意图识别、权限拦截、响应格式化（不使用LLM）
 * 数据安全：LLM只接触用户输入，完全不接触业务数据
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
2. 提取关键参数，特别是查询目标人员
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

⚠️ 重要：目标人员提取规则
- "查询我的待办" → params: {}
- "查询张三的待办" → params: { targetPerson: "张三" }
- "查询landray的代办" → params: { targetPerson: "landray" }
- "查询李四的待办数量" → params: { targetPerson: "李四" }
- "帮我查一下王五的待办" → params: { targetPerson: "王五" }

如果用户没有明确指定查询谁，默认就是查询"我的"，params: {}

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

用户："查询landray的代办"
返回：
\`\`\`json
{
  "agentId": "approval-agent",
  "action": "get_my_todo",
  "context": {
    "userId": "user-id",
    "params": {
      "targetPerson": "landray"
    }
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
- 特别注意：如果用户提到"xxx的待办/代办"，一定要在 params.targetPerson 中提取这个人的名字
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
   * 路由权限校验（只校验用户是否能调用该Agent，不做业务权限）
   * @param userContext 用户上下文
   * @param intentResult 意图识别结果
   * @returns 是否有权限
   */
  async checkRoutePermission(userContext: UserContext, intentResult: IntentResult): Promise<{ granted: boolean; reason?: string }> {
    console.log('[RootAgent] 开始路由权限校验:', {
      userId: userContext.userId,
      role: userContext.role,
      agentId: intentResult.agentId,
      action: intentResult.action,
    });

    // 1. 检查Agent是否存在且启用
    const agent = this.availableAgents.get(intentResult.agentId);
    if (!agent) {
      console.warn('[RootAgent] Agent不存在:', intentResult.agentId);
      return { granted: false, reason: `未找到对应的智能体: ${intentResult.agentId}` };
    }

    if (!agent.enabled) {
      console.warn('[RootAgent] Agent未启用:', intentResult.agentId);
      return { granted: false, reason: `智能体 ${agent.name} 未启用` };
    }

    // 2. 基础功能权限检查（只检查用户是否有权限访问该Agent功能）
    // 注意：这里不做业务数据权限，业务权限由业务Agent自己校验
    // 业务规则可以控制更细粒度的权限（如只有特定角色才能审批）

    // 2.1 检查是否需要登录
    if (!userContext.userId) {
      return { granted: false, reason: '请先登录' };
    }

    // 2.2 RootAgent 只做基础的路由权限检查（确保用户已登录）
    // 具体的业务权限（如查询/审批）由业务Agent的业务规则控制
    console.log('[RootAgent] 路由权限校验通过（已登录），业务权限由业务Agent校验');
    return { granted: true };
  }

  /**
   * 格式化响应（内网代码，不使用LLM）
   * @param businessResponse 业务Agent返回的结果
   * @returns 格式化后的文本
   */
  formatResponse(businessResponse: AgentResponse): string {
    console.log('[RootAgent] 开始格式化响应:', {
      code: businessResponse.code,
      msg: businessResponse.msg,
    });

    try {
      // 如果业务Agent返回错误，直接返回错误消息
      if (businessResponse.code !== '200') {
        return `❌ ${businessResponse.msg}`;
      }

      // 如果业务Agent返回的data已经是文本，直接返回
      if (typeof businessResponse.data === 'string') {
        return `✅ ${businessResponse.data}`;
      }

      // 如果业务Agent返回的是结构化数据，使用内网代码格式化
      if (typeof businessResponse.data === 'object' && businessResponse.data !== null) {
        return this.formatStructuredData(businessResponse.data, businessResponse.msg);
      }

      // 其他情况，返回消息
      return `✅ ${businessResponse.msg}`;
    } catch (error) {
      console.error('[RootAgent] 格式化响应失败:', error);
      // 格式化失败，返回原始消息
      return businessResponse.msg;
    }
  }

  /**
   * 格式化结构化数据（内网代码，不使用LLM）
   * @param data 结构化数据
   * @param defaultMessage 默认消息
   * @returns 格式化后的文本
   */
  private formatStructuredData(data: any, defaultMessage: string): string {
    // 检查是否是数组
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return `✅ ${defaultMessage || '查询成功，暂无数据'}`;
      }
      return this.formatArrayData(data);
    }

    // 检查是否是对象
    if (typeof data === 'object') {
      return this.formatObjectData(data);
    }

    // 其他情况，返回默认消息
    return `✅ ${defaultMessage || '操作成功'}`;
  }

  /**
   * 格式化数组数据
   * @param data 数组数据
   * @returns 格式化后的文本
   */
  private formatArrayData(data: any[]): string {
    const items = data.slice(0, 10); // 最多显示10条
    const lines = [`✅ 查询成功，共 ${data.length} 条记录：\n`];

    items.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        // 提取关键字段
        const title = item.title || item.name || item.subject || `记录${index + 1}`;
        const id = item.id || index + 1;
        const status = item.status ? ` [${item.status}]` : '';
        const time = item.createTime || item.time || item.date || '';

        lines.push(`${index + 1}. ${title}${status}`);
        if (time) {
          lines.push(`   时间：${time}`);
        }
      }
    });

    if (data.length > 10) {
      lines.push(`...还有 ${data.length - 10} 条记录`);
    }

    return lines.join('\n');
  }

  /**
   * 格式化对象数据
   * @param data 对象数据
   * @returns 格式化后的文本
   */
  private formatObjectData(data: any): string {
    const lines = [`✅ 操作成功：\n`];

    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
        lines.push(`${label}：${displayValue}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 完整的处理流程（只做意图识别，权限检查交给外部调用）
   * @param userInput 用户输入
   * @param userContext 用户上下文
   * @returns 意图识别结果
   */
  async process(userInput: string, userContext: UserContext): Promise<IntentResult> {
    try {
      // 意图识别（LLM：只传递用户信息，不传业务数据）
      const intent = await this.recognizeIntent(userInput, userContext);
      return intent;
    } catch (error) {
      console.error('[RootAgent] 处理失败:', error);
      throw error;
    }
  }
}

// 导出单例
export const rootAgent = new RootAgent();
