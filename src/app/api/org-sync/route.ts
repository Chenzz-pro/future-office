import { NextRequest, NextResponse } from 'next/server';
import { orgSyncService, SyncOptions } from '@/lib/sync/org-sync.service';
import { orgSyncLogRepository } from '@/lib/database/repositories/org-sync-log.repository';

/**
 * 组织架构同步API
 * POST /api/org-sync - 触发同步（全量或增量）
 * GET /api/org-sync/status - 获取同步状态
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { syncType, operatorId, operatorName, returnOrgType } = body as SyncOptions;

    if (!syncType || !['full', 'incremental'].includes(syncType)) {
      return NextResponse.json({
        success: false,
        message: '无效的同步类型，必须是 full 或 incremental'
      }, { status: 400 });
    }

    console.log(`[API] 触发${syncType === 'full' ? '全量' : '增量'}同步，操作人: ${operatorName || operatorId || 'system'}`);

    const result = await orgSyncService[syncType]({
      operatorId,
      operatorName,
      returnOrgType
    });

    return NextResponse.json({
      success: result.success,
      data: result,
      message: result.success ? '同步已启动' : result.message
    });
  } catch (error) {
    console.error('[API] 同步失败:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // 获取同步状态
    if (action === 'status') {
      const runningSync = await orgSyncLogRepository.findRunningSync();
      const lastSync = await orgSyncLogRepository.getLastSync();

      return NextResponse.json({
        success: true,
        data: {
          isRunning: !!runningSync,
          runningSync,
          lastSync
        }
      });
    }

    return NextResponse.json({
      success: false,
      message: '无效的操作'
    }, { status: 400 });
  } catch (error) {
    console.error('[API] 获取同步状态失败:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
