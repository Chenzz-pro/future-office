/**
 * 统一聊天API
 * POST /api/chat
 * 所有用户对话的统一入口
 */

import { NextRequest, NextResponse } from 'next/server';
import { rootAgent } from '@/lib/agents/root-agent';
import type { AgentContext } from '@/types/agent';

/**
 * POST /api/chat
 * 统一聊天接口
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      message,
      userId,
      deptId,
      role,
      conversationHistory = [],
    } = body;

    // 参数校验
    if (!message) {
      return NextResponse.json(
        { success: false, error: '消息不能为空' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    // 构建上下文
    const context: AgentContext = {
      userId,
      deptId: deptId || '',
      role: role || 'user',
      message,
      conversationHistory,
    };

    console.log('[API:Chat] 收到请求', {
      userId,
      message,
      role,
    });

    // 调用RootAgent处理
    const result = await rootAgent.process(context);

    console.log('[API:Chat] 处理结果', result);

    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      agentType: result.agentType,
    });
  } catch (error) {
    console.error('[API:Chat] 处理失败', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    );
  }
}
