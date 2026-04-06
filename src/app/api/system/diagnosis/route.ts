/**
 * 数据库诊断API
 * 用于诊断数据库连接问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';

/**
 * GET /api/system/diagnosis
 * 获取系统诊断信息
 */
export async function GET(request: NextRequest) {
  try {
    const diagnosis = {
      timestamp: new Date().toISOString(),
      database: {
        connected: dbManager.isConnected(),
        config: dbManager.getConfig(),
        poolStatus: dbManager.getPoolStatus(),
      },
      recommendations: [] as string[],
    };

    // 生成诊断建议
    if (!diagnosis.database.connected) {
      diagnosis.recommendations.push('❌ 数据库未连接，请检查数据库配置');
      diagnosis.recommendations.push('💡 访问 /system-init 页面重新配置数据库');
      diagnosis.recommendations.push('💡 检查数据库服务器是否正常运行');
      diagnosis.recommendations.push('💡 检查数据库用户名和密码是否正确');
    } else {
      diagnosis.recommendations.push('✅ 数据库连接正常');

      // 检查连接池状态
      if (diagnosis.database.poolStatus) {
        const { totalConnections, freeConnections, queuedRequests } = diagnosis.database.poolStatus;

        if (totalConnections >= 10) {
          diagnosis.recommendations.push('⚠️ 数据库连接池使用率较高，建议优化查询性能');
        }

        if (queuedRequests > 0) {
          diagnosis.recommendations.push(`⚠️ 当前有 ${queuedRequests} 个请求在排队等待连接`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: diagnosis,
    });
  } catch (error: unknown) {
    console.error('[API:Diagnosis] 诊断失败:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器错误';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
