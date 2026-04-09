import { NextRequest, NextResponse } from 'next/server';
import { orgSyncConfigRepository } from '@/lib/database/repositories/org-sync-config.repository';

/**
 * 定时任务配置API
 * GET /api/admin/sync-scheduler/config - 获取定时任务配置
 * PUT /api/admin/sync-scheduler/config - 更新定时任务配置
 */

export async function GET() {
  try {
    const config = await orgSyncConfigRepository.getJSON<{
      incremental: {
        enabled: boolean;
        interval: number;
        startTime?: string;
      };
      full: {
        enabled: boolean;
        interval: number;
        startTime?: string;
        dayOfMonth?: number;
      };
      monitor: {
        enabled: boolean;
        interval: number;
        startTime?: string;
      };
    }>('sync.scheduler_config', {
      incremental: {
        enabled: true,
        interval: 30,
        startTime: '00:00'
      },
      full: {
        enabled: true,
        interval: 720,
        startTime: '02:00',
        dayOfMonth: 1
      },
      monitor: {
        enabled: true,
        interval: 5,
        startTime: '00:00'
      }
    });

    return NextResponse.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('[API] 获取定时任务配置失败:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskType, config } = body;

    if (!taskType || !config) {
      return NextResponse.json({
        success: false,
        message: '缺少必要参数'
      }, { status: 400 });
    }

    // 获取当前配置
    const currentConfig = await orgSyncConfigRepository.getJSON<any>('sync.scheduler_config', {
      incremental: {
        enabled: true,
        interval: 30,
        startTime: '00:00'
      },
      full: {
        enabled: true,
        interval: 720,
        startTime: '02:00',
        dayOfMonth: 1
      },
      monitor: {
        enabled: true,
        interval: 5,
        startTime: '00:00'
      }
    });

    // 更新对应任务的配置
    currentConfig[taskType] = config;

    // 保存配置
    await orgSyncConfigRepository.setKey('sync.scheduler_config', currentConfig, 'json');

    return NextResponse.json({
      success: true,
      message: '配置已更新',
      data: currentConfig
    });
  } catch (error) {
    console.error('[API] 更新定时任务配置失败:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
