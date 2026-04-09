/**
 * RootAgent测试 API
 * 用于测试意图识别和权限拦截功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { rootAgent } from '@/lib/agents/root-agent';
import { dbManager, getOneAPIConfigRepository } from '@/lib/database/manager';
import { oneAPIManager } from '@/lib/oneapi';
import type { UserContext } from '@/lib/types/agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userInput, userId, deptId, role } = body;

    if (!userInput || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要参数：userInput 和 userId',
        },
        { status: 400 }
      );
    }

    console.log('[TestRootAgent] 收到请求:', {
      userInput: userInput.substring(0, 100),
      userId,
      deptId,
      role,
    });

    // 确保数据库已连接
    const isConnected = await dbManager.isConnected();
    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: '数据库未连接',
        },
        { status: 400 }
      );
    }

    // 加载oneAPI配置
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

    // 检查oneAPI是否启用
    if (!oneAPIManager.isEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'oneAPI未配置或未启用',
        },
        { status: 400 }
      );
    }

    // 初始化RootAgent
    await rootAgent.initialize();

    // 构建用户上下文
    const userContext: UserContext = {
      userId,
      deptId,
      role,
    };

    // 处理请求
    const result = await rootAgent.process(userInput, userContext);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[TestRootAgent] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    );
  }
}
