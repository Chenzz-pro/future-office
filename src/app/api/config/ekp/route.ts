import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database/manager';
import { EKPConfigRepository } from '@/lib/database/repositories/ekpconfig-admin.repository';

/**
 * GET /api/config/ekp - 获取 EKP 配置（仅全局配置）
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

    const ekpConfigRepo = new EKPConfigRepository();

    // 获取全局配置（system 级别）
    const globalConfig = await ekpConfigRepo.findByUserId('system');

    if (globalConfig) {
      return NextResponse.json({
        success: true,
        config: globalConfig,
        source: 'global',
        sourceName: globalConfig.baseUrl || '全局配置',
        message: '使用全局配置'
      });
    }

    // 未配置全局配置
    return NextResponse.json({
      success: false,
      config: null,
      source: 'none',
      message: '未配置全局EKP，请联系管理员配置'
    });
  } catch (error) {
    console.error('获取 EKP 配置失败:', error);
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
