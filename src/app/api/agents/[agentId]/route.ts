/**
 * Agent 详情查询 API
 * GET /api/agents/[agentId]
 * 
 * 查询指定Agent的详细信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentRepository } from '@/lib/database/repositories/agent.repository';

interface AgentDetailResponse {
  success: boolean;
  data?: {
    id: string;
    type: string;
    agentType: string;
    name: string;
    description: string;
    avatar: string;
    enabled: boolean;
    skillsConfig?: any;
    permissionRules?: any;
    businessRules?: any;
    version: number;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse<AgentDetailResponse>> {
  try {
    const { agentId } = await params;

    console.log(`[AgentDetail:API] 查询Agent详情:`, agentId);

    // 从数据库查询Agent详情
    const agent = await agentRepository.findById(agentId);

    if (!agent) {
      return NextResponse.json(
        { success: false, error: `未找到Agent: ${agentId}` },
        { status: 404 }
      );
    }

    console.log(`[AgentDetail:API] Agent详情查询成功:`, agent.name);

    // 返回结果
    return NextResponse.json({
      success: true,
      data: {
        id: agent.id,
        type: agent.type,
        agentType: agent.agentType,
        name: agent.name,
        description: agent.description,
        avatar: agent.avatar,
        enabled: agent.enabled,
        skillsConfig: agent.skillsConfig,
        permissionRules: agent.permissionRules,
        businessRules: agent.businessRules,
        version: agent.version,
        createdAt: agent.createdAt.toISOString(),
        updatedAt: agent.updatedAt.toISOString(),
      },
    });

  } catch (error) {
    console.error(`[AgentDetail:API] 查询失败:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    );
  }
}
