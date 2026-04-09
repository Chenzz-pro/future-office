import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { ApiKeyRepository } from '@/lib/database/repositories/apikey-admin.repository';

// System User ID - 用于管理员后台创建的系统级配置
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * GET /api/config/llm - 获取 LLM 配置（仅全局配置）
 *
 * 个人配置功能已移除，只返回管理员配置的全局配置
 */
export async function GET(request: NextRequest) {
  try {
    // 如果数据库未连接，返回空
    if (!dbManager.isConnected()) {
      return NextResponse.json({
        success: false,
        config: null,
        source: 'none',
        message: '数据库未连接，请联系管理员检查数据库配置'
      });
    }

    const apiKeyRepo = new ApiKeyRepository();

    // 获取全局配置（system 级别）
    const globalKeys = await apiKeyRepo.findByUserId(SYSTEM_USER_ID);
    const activeGlobalKey = globalKeys.find(k => k.isActive);

    if (activeGlobalKey) {
      return NextResponse.json({
        success: true,
        config: activeGlobalKey,
        source: 'global',
        sourceName: activeGlobalKey.name || '全局配置',
        message: '使用全局配置'
      });
    }

    // 未配置全局配置
    return NextResponse.json({
      success: false,
      config: null,
      source: 'none',
      message: '未配置全局LLM，请联系管理员配置'
    });
  } catch (error) {
    console.error('获取 LLM 配置失败:', error);
    return NextResponse.json(
      {
        success: false,
        config: null,
        source: 'none',
        message: error instanceof Error ? error.message : '获取配置失败'
      },
      { status: 500 }
    );
  }
}
