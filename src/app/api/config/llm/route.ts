import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { ApiKeyRepository } from '@/lib/database/repositories/apikey-admin.repository';

/**
 * GET /api/config/llm - 获取 LLM 配置（优先级：用户配置 > 全局配置）
 *
 * 查询参数：
 * - userId: 用户ID（可选，用于获取用户级配置）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // 如果数据库未连接，返回空（使用前端 localStorage 配置）
    if (!dbManager.isConnected()) {
      return NextResponse.json({
        success: true,
        useGlobal: false,
        config: null,
        message: '数据库未连接，使用前端配置',
      });
    }

    const apiKeyRepo = new ApiKeyRepository();

    // 1. 如果提供了 userId，尝试获取用户级配置
    if (userId && userId !== 'system') {
      const userKeys = await apiKeyRepo.findByUserId(userId);
      const activeUserKey = userKeys.find(k => k.isActive);

      if (activeUserKey) {
        return NextResponse.json({
          success: true,
          useGlobal: false,
          config: activeUserKey,
          source: 'user',
        });
      }
    }

    // 2. 降级使用全局配置（system 级别）
    const globalKeys = await apiKeyRepo.findByUserId('system');
    const activeGlobalKey = globalKeys.find(k => k.isActive);

    if (activeGlobalKey) {
      return NextResponse.json({
        success: true,
        useGlobal: true,
        config: activeGlobalKey,
        source: 'global',
      });
    }

    // 3. 都没有配置
    return NextResponse.json({
      success: true,
      useGlobal: false,
      config: null,
      message: '暂无可用配置',
    });
  } catch (error) {
    console.error('获取 LLM 配置失败:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
