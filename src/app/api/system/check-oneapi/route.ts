/**
 * 检查oneAPI配置状态
 * GET /api/system/check-oneapi
 */

import { NextRequest, NextResponse } from 'next/server';
import { oneAPIManager } from '@/lib/oneapi';
import { dbManager } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const status: any = {
      oneAPIManager: {
        isEnabled: oneAPIManager.isEnabled(),
        config: oneAPIManager.getConfig(),
        client: oneAPIManager.getClient() !== null,
      },
      database: {
        isConnected: dbManager.isConnected(),
        hasOneAPIRepository: dbManager.oneAPIConfigRepository !== null,
      },
    };

    // 如果数据库连接且oneAPI repository存在，查询数据库中的配置
    if (status.database.isConnected && status.database.hasOneAPIRepository) {
      try {
        const configs = await dbManager.oneAPIConfigRepository!.findEnabled();
        status.database.configs = configs;
        status.database.configCount = configs.length;
      } catch (error) {
        status.database.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('[CheckOneAPI] 检查失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器错误',
      },
      { status: 500 }
    );
  }
}
