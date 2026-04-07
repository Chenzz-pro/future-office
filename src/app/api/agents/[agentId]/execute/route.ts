/**
 * 业务 Agent 执行 API
 * POST /api/agents/[agentId]/execute
 * 
 * 新架构：业务Agent执行API，不使用LLM，纯代码逻辑
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentFactory } from '@/lib/agents/agent-factory';
import type { UserContext, IntentResult, AgentResponse } from '@/lib/types/agent';

interface ExecuteRequest {
  action: string;
  params?: Record<string, any>;
  userId: string;
  deptId?: string;
  role?: string;
}

interface ExecuteResponse {
  success: boolean;
  data?: AgentResponse;
  error?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
): Promise<NextResponse<ExecuteResponse>> {
  try {
    const { agentId } = await params;
    const body = await request.json() as ExecuteRequest;
    const { action, params: paramsData, userId, deptId, role } = body;

    // 参数校验
    if (!action) {
      return NextResponse.json(
        { success: false, error: '操作类型不能为空' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    console.log(`[Agent:${agentId}] 收到执行请求:`, {
      action,
      userId,
      deptId,
      role,
    });

    // 1. 初始化Agent工厂
    await agentFactory.initialize();

    // 2. 获取业务Agent
    const agent = agentFactory.getAgent(agentId);
    if (!agent) {
      return NextResponse.json(
        { success: false, error: `未找到Agent: ${agentId}` },
        { status: 404 }
      );
    }

    // 3. 构建用户上下文
    const userContext: UserContext = {
      userId,
      deptId,
      role: role || 'user',
    };

    // 4. 构建意图结果
    const intent: IntentResult = {
      agentId,
      action,
      context: {
        userId,
        deptId,
        params: paramsData || {},
      },
    };

    // 5. 执行Agent
    const result = await agent.execute(intent, userContext);

    console.log(`[Agent:${agentId}] 执行完成:`, result);

    // 6. 返回结果
    return NextResponse.json({
      success: result.code === '200',
      data: result,
      error: result.code !== '200' ? result.msg : undefined,
    });

  } catch (error) {
    console.error(`[Agent] 执行失败:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    );
  }
}
