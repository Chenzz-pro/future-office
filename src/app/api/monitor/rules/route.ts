/**
 * 告警规则管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { monitorRepository } from '@/lib/monitor/monitor-repository';
import {
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  AlertType,
  AlertLevel,
} from '@/lib/monitor/types';

/**
 * GET /api/monitor/rules
 * 获取告警规则列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ruleId = searchParams.get('id');
    const type = searchParams.get('type') as AlertType | null;
    const level = searchParams.get('level') as AlertLevel | null;
    const enabled = searchParams.get('enabled');
    const relatedSystem = searchParams.get('relatedSystem');

    // 获取单个规则
    if (ruleId) {
      const rule = await monitorRepository.getAlertRuleById(ruleId);
      if (!rule) {
        return NextResponse.json(
          { success: false, error: '规则不存在' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: rule });
    }

    // 获取规则列表
    const filters: {
      type?: AlertType;
      level?: AlertLevel;
      enabled?: boolean;
      relatedSystem?: string;
    } = {};

    if (type) filters.type = type;
    if (level) filters.level = level;
    if (enabled !== null) filters.enabled = enabled === 'true';
    if (relatedSystem) filters.relatedSystem = relatedSystem;

    const rules = await monitorRepository.getAllAlertRules(filters);

    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error('[API:Monitor:Rules] 获取规则失败:', error);
    return NextResponse.json(
      { success: false, error: '获取规则失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitor/rules
 * 创建告警规则
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const ruleRequest: CreateAlertRuleRequest = {
      name: body.name,
      description: body.description,
      type: body.type,
      level: body.level,
      enabled: body.enabled ?? true,
      conditions: body.conditions || [],
      relatedSystem: body.relatedSystem,
      relatedModule: body.relatedModule,
      notificationConfig: {
        channels: body.notificationConfig?.channels || [],
        recipients: body.notificationConfig?.recipients,
        webhookUrls: body.notificationConfig?.webhookUrls,
        cooldownMinutes: body.notificationConfig?.cooldownMinutes,
        maxAlertsPerHour: body.notificationConfig?.maxAlertsPerHour,
      },
      metadata: body.metadata,
    };

    // 验证必填字段
    if (!ruleRequest.name || !ruleRequest.type || !ruleRequest.level) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    const rule = await monitorRepository.createAlertRule(ruleRequest);

    return NextResponse.json({
      success: true,
      message: '规则创建成功',
      data: rule,
    });
  } catch (error) {
    console.error('[API:Monitor:Rules] 创建规则失败:', error);
    return NextResponse.json(
      { success: false, error: '创建规则失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/monitor/rules
 * 更新告警规则
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少规则ID' },
        { status: 400 }
      );
    }

    const updateRequest: UpdateAlertRuleRequest = {
      id,
      ...updateData,
    };

    const rule = await monitorRepository.updateAlertRule(updateRequest);

    if (!rule) {
      return NextResponse.json(
        { success: false, error: '规则不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '规则更新成功',
      data: rule,
    });
  } catch (error) {
    console.error('[API:Monitor:Rules] 更新规则失败:', error);
    return NextResponse.json(
      { success: false, error: '更新规则失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/monitor/rules
 * 删除告警规则
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ruleId = searchParams.get('id');

    if (!ruleId) {
      return NextResponse.json(
        { success: false, error: '缺少规则ID' },
        { status: 400 }
      );
    }

    const deleted = await monitorRepository.deleteAlertRule(ruleId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '规则不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '规则删除成功',
    });
  } catch (error) {
    console.error('[API:Monitor:Rules] 删除规则失败:', error);
    return NextResponse.json(
      { success: false, error: '删除规则失败' },
      { status: 500 }
    );
  }
}
