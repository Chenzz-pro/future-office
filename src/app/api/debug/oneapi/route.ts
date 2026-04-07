/**
 * 调试 oneAPI 状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { oneAPIManager } from '@/lib/oneapi';
import { dbManager, getOneAPIConfigRepository } from '@/lib/database/manager';

export async function GET() {
  try {
    // 1. 检查数据库连接
    const isConnected = await dbManager.isConnected();
    
    // 2. 加载oneAPI配置
    if (isConnected) {
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
    }

    // 3. 检查oneAPI状态
    const oneAPIEnabled = oneAPIManager.isEnabled();
    const oneAPIConfig = oneAPIManager.getConfig();

    return NextResponse.json({
      success: true,
      data: {
        dbConnected: isConnected,
        oneAPIEnabled,
        oneAPIConfig: oneAPIConfig ? {
          name: oneAPIConfig.name,
          baseUrl: oneAPIConfig.baseUrl,
          model: oneAPIConfig.model,
          enabled: oneAPIConfig.enabled,
        } : null,
      },
    });
  } catch (error) {
    console.error('[DebugOneAPI] 错误:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    );
  }
}
