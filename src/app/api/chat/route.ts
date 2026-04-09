/**
 * 统一聊天API
 * POST /api/chat
 * 所有用户对话的统一入口
 */

import { NextRequest, NextResponse } from 'next/server';
import { rootAgent } from '@/lib/agents/root-agent';
import { agentFactory } from '@/lib/agents/agent-factory';
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
    const userContext = {
      userId,
      deptId: deptId || undefined,
      role: role || 'user',
    };

    console.log('[API:Chat] 收到请求', {
      userId,
      message,
      role,
    });

    try {
      // 1. 调用RootAgent进行意图识别
      console.log('[API:Chat] 开始意图识别...');
      const intentResult = await rootAgent.process(message, userContext);
      console.log('[API:Chat] 意图识别结果:', intentResult);

      // 2. 检查是否无法识别意图
      if (intentResult.agentId === 'unknown') {
        return NextResponse.json({
          success: true,
          data: {
            content: `抱歉，我无法理解您的意图。您可以尝试：\n- "查询我的待办"\n- "查询我的会议"\n- "预定会议室"`,
          },
        });
      }

      // 3. 检查Agent是否存在
      const businessAgent = await agentFactory.getAgent(intentResult.agentId);
      if (!businessAgent) {
        return NextResponse.json({
          success: true,
          data: {
            content: `未找到对应的智能体: ${intentResult.agentId}`,
          },
        });
      }

      // 4. 执行业务Agent
      console.log('[API:Chat] 执行业务Agent:', intentResult.agentId);
      const agentResponse = await businessAgent.execute(intentResult, userContext);
      console.log('[API:Chat] 业务Agent响应:', agentResponse);

      // 5. 格式化响应
      const formattedResponse = rootAgent.formatResponse(agentResponse);

      return NextResponse.json({
        success: true,
        data: {
          content: formattedResponse,
          agentType: agentResponse.agentType,
          permissionChecked: agentResponse.permissionChecked,
        },
      });
    } catch (agentError) {
      // Agent执行失败，返回友好错误消息
      console.error('[API:Chat] Agent执行失败:', agentError);
      return NextResponse.json({
        success: true,
        data: {
          content: `处理失败: ${agentError instanceof Error ? agentError.message : '未知错误'}`,
        },
      });
    }
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
