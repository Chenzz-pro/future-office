/**
 * Agent 工厂
 * 用于获取和管理所有 Agent 实例
 */

import { approvalAgent } from './approval-agent';
import { meetingAgent } from './meeting-agent';
import { dataAgent } from './data-agent';
import { assistantAgent } from './assistant-agent';
import { BaseBusinessAgent } from './base-business-agent';

export class AgentFactory {
  private static agents: Map<string, BaseBusinessAgent> = new Map();

  /**
   * 初始化所有 Agent
   */
  static async initialize(): Promise<void> {
    console.log('[AgentFactory] 开始初始化所有 Agent...');

    // 注册所有 Agent
    this.agents.set('approval-agent', approvalAgent);
    this.agents.set('meeting-agent', meetingAgent);
    this.agents.set('data-agent', dataAgent);
    this.agents.set('assistant-agent', assistantAgent);

    // 初始化所有 Agent
    const initPromises = Array.from(this.agents.values()).map(agent => agent.initialize());
    await Promise.all(initPromises);

    console.log('[AgentFactory] 所有 Agent 初始化完成');
  }

  /**
   * 根据 agentId 获取 Agent 实例
   * @param agentId Agent ID
   * @returns Agent 实例
   */
  static getAgent(agentId: string): BaseBusinessAgent | null {
    return this.agents.get(agentId) || null;
  }

  /**
   * 获取所有可用的 Agent ID
   * @returns Agent ID 列表
   */
  static getAvailableAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * 检查 Agent 是否可用
   * @param agentId Agent ID
   * @returns 是否可用
   */
  static isAgentAvailable(agentId: string): boolean {
    return this.agents.has(agentId);
  }
}

// 导出单例
export const agentFactory = AgentFactory;
