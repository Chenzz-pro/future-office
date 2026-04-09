/**
 * 告警记录管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { monitorRepository } from '@/lib/monitor/monitor-repository';
import { AlertLevel, AlertType, CreateAlertRequest } from '@/lib/monitor/types';

/**
 * GET /api/monitor/alerts
 * 获取告警列表或统计
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const alertId = searchParams.get('id');
    const status = searchParams.get('status') as 'active' | 'acknowledged' | 'resolved' | 'muted' | null;
    const level = searchParams.get('level') as AlertLevel | null;
    const type = searchParams.get('type') as AlertType | null;
    const relatedSystem = searchParams.get('relatedSystem');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 获取统计
    if (action === 'stats') {
      const stats = await monitorRepository.getAlertStats(relatedSystem || undefined);
      return NextResponse.json({ success: true, data: stats });
    }

    // 获取单个告警
    if (alertId) {
      const alert = await monitorRepository.getAlertById(alertId);
      if (!alert) {
        return NextResponse.json(
          { success: false, error: '告警不存在' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: alert });
    }

    // 获取告警列表
    const filters: {
      status?: 'active' | 'acknowledged' | 'resolved' | 'muted';
      level?: AlertLevel;
      type?: AlertType;
      relatedSystem?: string;
      limit?: number;
      offset?: number;
    } = {};

    if (status) filters.status = status;
    if (level) filters.level = level;
    if (type) filters.type = type;
    if (relatedSystem) filters.relatedSystem = relatedSystem;
    filters.limit = limit;
    filters.offset = offset;

    const result = await monitorRepository.getAlerts(filters);

    return NextResponse.json({
      success: true,
      data: result.alerts,
      total: result.total,
    });
  } catch (error) {
    console.error('[API:Monitor:Alerts] 获取告警失败:', error);
    return NextResponse.json(
      { success: false, error: '获取告警失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitor/alerts
 * 创建告警 / 更新告警状态
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // 更新告警状态
    if (action === 'updateStatus') {
      const { id, status } = body;

      if (!id || !status) {
        return NextResponse.json(
          { success: false, error: '缺少参数' },
          { status: 400 }
        );
      }

      if (!['acknowledged', 'resolved', 'muted'].includes(status)) {
        return NextResponse.json(
          { success: false, error: '无效的状态' },
          { status: 400 }
        );
      }

      await monitorRepository.updateAlertStatus(id, status);

      return NextResponse.json({
        success: true,
        message: '状态更新成功',
      });
    }

    // 创建新告警
    const alertRequest: CreateAlertRequest = {
      ruleId: body.ruleId,
      ruleName: body.ruleName,
      type: body.type,
      level: body.level,
      title: body.title,
      message: body.message,
      source: body.source,
      relatedSystem: body.relatedSystem,
      relatedModule: body.relatedModule,
      relatedId: body.relatedId,
      details: body.details,
    };

    // 验证必填字段
    if (!alertRequest.type || !alertRequest.level || !alertRequest.title) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    const alert = await monitorRepository.createAlert(alertRequest);

    return NextResponse.json({
      success: true,
      message: '告警创建成功',
      data: alert,
    });
  } catch (error) {
    console.error('[API:Monitor:Alerts] 创建告警失败:', error);
    return NextResponse.json(
      { success: false, error: '创建告警失败' },
      { status: 500 }
    );
  }
}
