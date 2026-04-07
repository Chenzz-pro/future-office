/**
 * RootAgent API - 统一对话入口
 * POST /api/agents/root
 * 
 * 新架构：唯一使用LLM的API，负责意图识别、权限拦截、话术润色
 */

import { NextRequest, NextResponse } from 'next/server';
import { rootAgent } from '@/lib/agents/root-agent';
import { agentFactory } from '@/lib/agents/agent-factory';
import { dbManager, getOneAPIConfigRepository } from '@/lib/database/manager';
import { oneAPIManager } from '@/lib/oneapi';
import type { UserContext, IntentResult, AgentResponse } from '@/lib/types/agent';

interface ChatRequest {
  message: string;
  userId: string;
  deptId?: string;
  role?: string;
}

interface ChatResponse {
  success: boolean;
  data?: {
    message?: string;
    intent?: IntentResult;
    businessResult?: AgentResponse;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  try {
    const body = await request.json() as ChatRequest;
    const { message, userId, deptId, role } = body;

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

    console.log('[RootAgent:API] 收到请求:', {
      message: message.substring(0, 100),
      userId,
      deptId,
      role,
    });

    // 1. 确保数据库已连接
    const isConnected = await dbManager.isConnected();
    if (!isConnected) {
      return NextResponse.json(
        { success: false, error: '数据库未连接' },
        { status: 400 }
      );
    }

    // 2. 加载oneAPI配置
    const repo = getOneAPIConfigRepository();
    if (repo) {
      const configs = await repo.findEnabled();
      if (configs.length > 0) {
        const config = configs[0];
        oneAPIManager.initialize({
          id: config.id,
          name: config.name,
          baseUrl: config.base_url,
          apiKey: config.api_key,
          model: config.model,
          enabled: config.enabled,
          createdAt: config.created_at,
          updatedAt: config.updated_at,
        });
      }
    }

    // 3. 检查oneAPI是否启用
    if (!oneAPIManager.isEnabled()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'oneAPI未配置或未启用，请联系管理员配置' 
        },
        { status: 400 }
      );
    }

    // 4. 初始化Agent工厂
    await agentFactory.initialize();

    // 5. 初始化RootAgent
    await rootAgent.initialize();

    // 6. 构建用户上下文
    const userContext: UserContext = {
      userId,
      deptId,
      role: role || 'user',
    };

    // 7. 调用RootAgent处理（意图识别 + 权限拦截）
    const rootResult = await rootAgent.process(message, userContext);

    console.log('[RootAgent:API] RootAgent处理完成:', {
      intent: rootResult.intent,
      permissionGranted: rootResult.permissionGranted,
    });

    // 8. 权限检查
    if (!rootResult.permissionGranted) {
      return NextResponse.json({
        success: false,
        error: '抱歉，您没有权限执行此操作',
        data: {
          intent: rootResult.intent,
        },
      });
    }

    // 9. 检查是否有匹配的业务Agent
    const agentId = rootResult.intent.agentId;
    if (agentId === 'unknown') {
      // 无匹配的Agent，返回RootAgent的直接回复
      const defaultMessage = '我暂时无法处理该需求，请尝试以下方式：\n1. 查询待办事项\n2. 查询会议列表\n3. 预定会议室\n4. 查询个人日程';
      
      return NextResponse.json({
        success: true,
        data: {
          message: defaultMessage,
          intent: rootResult.intent,
        },
      });
    }

    // 10. 获取业务Agent并执行
    const businessAgent = agentFactory.getAgent(agentId);
    if (!businessAgent) {
      return NextResponse.json({
        success: false,
        error: `未找到对应的业务Agent: ${agentId}`,
        data: {
          intent: rootResult.intent,
        },
      });
    }

    // 11. 执行业务Agent
    const businessResult = await businessAgent.execute(rootResult.intent, userContext);

    console.log('[RootAgent:API] 业务Agent执行完成:', businessResult);

    // 12. 话术润色
    let finalMessage: string;
    if (businessResult.code === '200') {
      finalMessage = await rootAgent.polishResponse(businessResult);
    } else {
      finalMessage = businessResult.msg;
    }

    // 13. 返回最终结果
    return NextResponse.json({
      success: businessResult.code === '200',
      data: {
        message: finalMessage,
        intent: rootResult.intent,
        businessResult,
      },
      error: businessResult.code !== '200' ? businessResult.msg : undefined,
    });

  } catch (error) {
    console.error('[RootAgent:API] 处理失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    );
  }
}
