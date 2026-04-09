import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';

/**
 * 告警API
 * GET /api/admin/sync-alerts?type=active - 获取活跃告警
 * GET /api/admin/sync-alerts?type=history - 获取告警历史
 * POST /api/admin/sync-alerts?action=mark-read - 标记告警为已读
 * POST /api/admin/sync-alerts?action=clear - 清除告警
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (type === 'active') {
      // 获取活跃告警（未清除）
      const result = await dbManager.query<any[]>(`
        SELECT
          id,
          alert_type,
          severity,
          message,
          details,
          created_at,
          is_resolved,
          resolved_at
        FROM sync_alerts
        WHERE is_cleared = 0
        ORDER BY created_at DESC
        LIMIT ?
      `, [limit]);

      // 统计活跃告警数量
      const countResult = await dbManager.query<any[]>(`
        SELECT
          alert_type,
          severity,
          COUNT(*) as count
        FROM sync_alerts
        WHERE is_cleared = 0
        GROUP BY alert_type, severity
      `);

      const stats = {
        total: result.rows.length,
        critical: result.rows.filter((r: any) => r.severity === 'critical').length,
        warning: result.rows.filter((r: any) => r.severity === 'warning').length,
        info: result.rows.filter((r: any) => r.severity === 'info').length,
        byType: countResult.rows
      };

      return NextResponse.json({
        success: true,
        data: result.rows,
        stats
      });
    } else if (type === 'history') {
      // 获取告警历史
      const result = await dbManager.query<any[]>(`
        SELECT
          id,
          alert_type,
          severity,
          message,
          details,
          created_at,
          is_resolved,
          resolved_at,
          is_cleared,
          cleared_at
        FROM sync_alerts
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      // 获取总数
      const countResult = await dbManager.query<any[]>(`
        SELECT COUNT(*) as total FROM sync_alerts
      `);

      return NextResponse.json({
        success: true,
        data: result.rows,
        pagination: {
          total: (countResult.rows[0] as any).total,
          limit,
          offset
        }
      });
    }

    return NextResponse.json({
      success: false,
      message: '无效的type参数'
    }, { status: 400 });
  } catch (error) {
    console.error('[API] 获取告警失败:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId, ids } = body;

    if (action === 'mark-read') {
      // 标记告警为已读
      const alertIds = ids || (alertId ? [alertId] : []);
      if (alertIds.length === 0) {
        return NextResponse.json({
          success: false,
          message: '请指定告警ID'
        }, { status: 400 });
      }

      const placeholders = alertIds.map(() => '?').join(',');
      await dbManager.query(`
        UPDATE sync_alerts
        SET is_read = 1
        WHERE id IN (${placeholders})
      `, alertIds);

      return NextResponse.json({
        success: true,
        message: `已标记 ${alertIds.length} 条告警为已读`
      });
    } else if (action === 'clear') {
      // 清除告警
      const alertIds = ids || (alertId ? [alertId] : []);
      if (alertIds.length === 0) {
        return NextResponse.json({
          success: false,
          message: '请指定告警ID'
        }, { status: 400 });
      }

      const placeholders = alertIds.map(() => '?').join(',');
      await dbManager.query(`
        UPDATE sync_alerts
        SET is_cleared = 1, cleared_at = NOW()
        WHERE id IN (${placeholders})
      `, alertIds);

      return NextResponse.json({
        success: true,
        message: `已清除 ${alertIds.length} 条告警`
      });
    } else if (action === 'resolve') {
      // 解决告警
      const alertIds = ids || (alertId ? [alertId] : []);
      if (alertIds.length === 0) {
        return NextResponse.json({
          success: false,
          message: '请指定告警ID'
        }, { status: 400 });
      }

      const placeholders = alertIds.map(() => '?').join(',');
      await dbManager.query(`
        UPDATE sync_alerts
        SET is_resolved = 1, resolved_at = NOW()
        WHERE id IN (${placeholders})
      `, alertIds);

      return NextResponse.json({
        success: true,
        message: `已标记 ${alertIds.length} 条告警为已解决`
      });
    }

    return NextResponse.json({
      success: false,
      message: '无效的action参数'
    }, { status: 400 });
  } catch (error) {
    console.error('[API] 操作告警失败:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
