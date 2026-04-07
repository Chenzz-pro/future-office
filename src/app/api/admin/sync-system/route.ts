import { NextRequest, NextResponse } from 'next/server';
import {
  startSyncSystem,
  stopSyncSystem,
  restartSyncSystem,
  getSyncSystemStatus
} from '@/lib/sync/sync-system-startup';
import { syncScheduler } from '@/lib/sync/sync-scheduler';
import { syncMonitor } from '@/lib/sync/sync-monitor';
import { orgSyncService } from '@/lib/sync/org-sync-service';

/**
 * 同步系统管理API
 * GET /api/admin/sync-system/status - 获取同步系统状态
 * POST /api/admin/sync-system/start - 启动同步系统
 * POST /api/admin/sync-system/stop - 停止同步系统
 * POST /api/admin/sync-system/restart - 重启同步系统
 * POST /api/admin/sync-system/incremental-sync - 手动触发增量同步
 * POST /api/admin/sync-system/full-sync - 手动触发全量同步
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // 获取同步系统状态
    if (action === 'status') {
      const status = getSyncSystemStatus();
      return NextResponse.json({
        success: true,
        data: status
      });
    }

    // 获取调度器状态
    if (action === 'scheduler-status') {
      const schedulerStatus = syncScheduler.getStatus();
      return NextResponse.json({
        success: true,
        data: schedulerStatus
      });
    }

    // 获取监控状态
    if (action === 'monitor-status') {
      const monitorStatus = syncMonitor.getStatus();
      return NextResponse.json({
        success: true,
        data: monitorStatus
      });
    }

    // 获取告警列表
    if (action === 'alerts') {
      const level = searchParams.get('level') as any;
      const alerts = syncMonitor.getAlerts(level);
      return NextResponse.json({
        success: true,
        data: alerts
      });
    }

    // 获取告警历史
    if (action === 'alert-history') {
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const history = syncMonitor.getAlertHistory(limit);
      return NextResponse.json({
        success: true,
        data: history
      });
    }

    return NextResponse.json({
      success: false,
      message: '无效的操作'
    }, { status: 400 });
  } catch (error) {
    console.error('[API] 同步系统管理失败:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // 启动同步系统
    if (action === 'start') {
      const result = await startSyncSystem();
      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.success ? '同步系统启动成功' : '同步系统启动失败'
      });
    }

    // 停止同步系统
    if (action === 'stop') {
      await stopSyncSystem();
      return NextResponse.json({
        success: true,
        message: '同步系统已停止'
      });
    }

    // 重启同步系统
    if (action === 'restart') {
      const result = await restartSyncSystem();
      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.success ? '同步系统重启成功' : '同步系统重启失败'
      });
    }

    // 手动触发增量同步
    if (action === 'incremental-sync') {
      const { operatorId, operatorName } = body;
      const result = await syncScheduler.manualIncrementalSync();
      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.success ? '增量同步已触发' : result.message
      });
    }

    // 手动触发全量同步
    if (action === 'full-sync') {
      const { operatorId, operatorName } = body;
      const result = await syncScheduler.manualFullSync();
      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.success ? '全量同步已触发' : result.message
      });
    }

    // 清除告警
    if (action === 'clear-alerts') {
      const { alertId } = body;
      syncMonitor.clearAlerts(alertId);
      return NextResponse.json({
        success: true,
        message: '告警已清除'
      });
    }

    return NextResponse.json({
      success: false,
      message: '无效的操作'
    }, { status: 400 });
  } catch (error) {
    console.error('[API] 同步系统管理失败:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
