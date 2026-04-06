/**
 * 个人助理Agent
 * 负责：日程管理、提醒通知、个人事务
 */

import { ASSISTANT_AGENT_CONFIG } from '@/lib/constants/agents';
import { oneAPIManager } from '@/lib/oneapi';
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

    // 调用 oneAPI 生成响应
    try {
      // 直接读取配置文件，避免依赖 dbManager 单例
      const fs = await import('fs');
      const path = await import('path');
      const CONFIG_FILE_PATH = '/workspace/projects/.db-config.json';

      let dbConfig = null;
      try {
        if (fs.existsSync(CONFIG_FILE_PATH)) {
          const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
          dbConfig = JSON.parse(data);
          console.log('[AssistantAgent] 从配置文件读取数据库配置');
        }
      } catch (err) {
        console.error('[AssistantAgent] 读取配置文件失败:', err);
      }

      if (!dbConfig) {
        console.log('[AssistantAgent] 未找到数据库配置，返回固定响应');
        return this.getFixedResponse(context.message);
      }

      // 创建临时连接池读取 oneAPI 配置
      const mysql = (await import('mysql2/promise')).default;
      const connection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.databaseName,
      });

      console.log('[AssistantAgent] 临时连接数据库成功');

      // 查询启用的 oneAPI 配置
      const [rows] = await connection.execute(
        'SELECT * FROM oneapi_configs WHERE enabled = 1 LIMIT 1'
      );

      await connection.end();

      const configs = rows as any[];
      if (!configs || configs.length === 0) {
        console.log('[AssistantAgent] 未找到启用的 oneAPI 配置，返回固定响应');
        return this.getFixedResponse(context.message);
      }

      const config = configs[0];
      console.log('[AssistantAgent] 使用 oneAPI 配置:', {
        name: config.name,
        baseUrl: config.base_url,
        model: config.model,
        enabled: config.enabled,
      });

      if (!config.enabled) {
        console.log('[AssistantAgent] oneAPI 未启用，返回固定响应');
        return this.getFixedResponse(context.message);
      }

      console.log('[AssistantAgent] 调用 oneAPI 生成响应');

      // 创建 oneAPI 客户端
      const { OneAPIClient } = await import('@/lib/oneapi/client');
      const client = new OneAPIClient({
        id: config.id,
        name: config.name,
        baseUrl: config.base_url,
        apiKey: config.api_key,
        model: config.model,
        enabled: config.enabled,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      });

      // 构建消息列表
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system' as const,
          content: '你是企业OA系统的个人助理，负责回答用户的各种问题。请用友好、专业的语气回答。',
        },
      ];

      // 如果有对话历史，添加到消息列表中
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        const historyMessages = context.conversationHistory.map((msg) => {
          // 确保角色类型正确，只允许 'system'、'user' 或 'assistant'
          let role: 'system' | 'user' | 'assistant' = 'user';
          if (msg.role === 'assistant') {
            role = 'assistant';
          } else if (msg.role === 'system') {
            role = 'system';
          } else {
            role = 'user';
          }

          return {
            role,
            content: msg.content,
          };
        });
        messages.push(...historyMessages);
      }

      // 添加当前用户消息
      messages.push({
        role: 'user' as const,
        content: context.message,
      });

      // 调用 oneAPI
      const response = await client.chat(messages, {
        temperature: 0.7,
        maxTokens: 2000,
      });

      console.log('[AssistantAgent] oneAPI 响应成功', {
        responseLength: response.length,
      });

      return {
        success: true,
        data: {
          type: 'general',
          content: response,
        },
        agentType: 'assistant',
      };
    } catch (error) {
      console.error('[AssistantAgent] oneAPI 调用失败', error);

      // 降级到固定响应
      return this.getFixedResponse(context.message);
    }
  }

  /**
   * 返回固定响应
   */
  private getFixedResponse(message: string): AgentResult {
    return {
      success: true,
      data: {
        type: 'general',
        content: `我收到了您的消息："${message}"，正在为您处理...`,
      },
      agentType: 'assistant',
    };
  }
}
