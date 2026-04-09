/**
 * Agent 列表查询 API
 * GET /api/agents
 * 
 * 查询所有可用的业务Agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentFactory } from '@/lib/agents/agent-factory';
import { agentRepository } from '@/lib/database/repositories/agent.repository';

interface AgentListResponse {
  success: boolean;
  data?: {
    availableAgents: string[];
    agents: Array<{
      id: string;
      type: string;
      name: string;
      description: string;
      avatar: string;
      enabled: boolean;
    }>;
  };
  error?: string;
}

export async function GET(): Promise<NextResponse<AgentListResponse>> {
  try {
    console.log('[Agents:API] 查询Agent列表');

    // 1. 初始化Agent工厂
    await agentFactory.initialize();

    // 2. 获取可用的Agent ID
    const availableAgentIds = agentFactory.getAvailableAgentIds();

    // 3. 从数据库查询Agent详情
    const agents = await agentRepository.getBusinessAgents();

    console.log('[Agents:API] Agent列表查询成功:', {
      count: agents.length,
    });

    // 4. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        availableAgents: availableAgentIds,
        agents: agents.map(agent => ({
          id: agent.id,
          type: agent.type,
          name: agent.name,
          description: agent.description,
          avatar: agent.avatar,
          enabled: agent.enabled,
        })),
      },
    });

  } catch (error) {
    console.error('[Agents:API] 查询失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    );
  }
}
