/**
 * 监控中心表初始化 API
 * 用于创建监控中心相关的数据库表
 * 
 * GET /api/monitor/init?action=status - 检查表是否存在
 * POST /api/monitor/init - 初始化表
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';
import { RowDataPacket } from 'mysql2';

// 定义查询结果类型
interface CountRow extends RowDataPacket {
  count: number;
}

/**
 * GET /api/monitor/init?action=status
 * 检查监控中心表是否存在
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    // 如果是 status 操作
    if (action === 'status') {
      // 检查 alert_rules 表
      const rulesResult = await dbManager.query<CountRow>(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'alert_rules'
      `);

      // 检查 alerts 表
      const alertsResult = await dbManager.query<CountRow>(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'alerts'
      `);

      // 检查 notification_channels 表
      const channelsResult = await dbManager.query<CountRow>(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'notification_channels'
      `);

      const alertRulesTableExists = rulesResult.rows?.[0]?.count > 0;
      const alertsTableExists = alertsResult.rows?.[0]?.count > 0;
      const notificationChannelsTableExists = channelsResult.rows?.[0]?.count > 0;

      return NextResponse.json({
        success: true,
        data: {
          tablesExist: alertRulesTableExists && alertsTableExists && notificationChannelsTableExists,
          alertRulesTable: alertRulesTableExists,
          alertsTable: alertsTableExists,
          notificationChannelsTable: notificationChannelsTableExists,
        },
      });
    }

    // 默认返回状态
    return NextResponse.json({
      success: true,
      message: 'Monitor Init API',
      endpoints: {
        'GET ?action=status': 'Check table status',
        'POST': 'Initialize tables',
      },
    });
  } catch (error) {
    console.error('[API:Monitor:Init] 检查表失败:', error);
    return NextResponse.json(
      { success: false, error: '检查监控中心表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitor/init
 * 初始化监控中心表
 */
export async function POST() {
  try {
    console.log('[API:Monitor:Init] 开始初始化监控中心表...');

    // 1. 创建告警规则表
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id VARCHAR(36) PRIMARY KEY COMMENT '规则ID',
        name VARCHAR(200) NOT NULL COMMENT '规则名称',
        description VARCHAR(500) COMMENT '规则描述',
        type VARCHAR(50) NOT NULL COMMENT '告警类型',
        level VARCHAR(20) NOT NULL COMMENT '告警级别',
        enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
        conditions JSON COMMENT '触发条件',
        related_system VARCHAR(100) COMMENT '关联系统',
        related_module VARCHAR(100) COMMENT '关联模块',
        notification_channels JSON COMMENT '通知渠道',
        notification_recipients JSON COMMENT '通知接收人',
        notification_webhooks JSON COMMENT 'Webhook地址',
        cooldown_minutes INT DEFAULT 5 COMMENT '冷却时间（分钟）',
        max_alerts_per_hour INT COMMENT '每小时最大告警数',
        metadata JSON COMMENT '元数据',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        created_by VARCHAR(36) COMMENT '创建人',
        UNIQUE KEY uk_name (name),
        INDEX idx_type (type),
        INDEX idx_level (level),
        INDEX idx_enabled (enabled),
        INDEX idx_related_system (related_system)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='告警规则表'
    `);
    console.log('[API:Monitor:Init] alert_rules 表创建成功');

    // 2. 创建告警记录表
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id VARCHAR(36) PRIMARY KEY COMMENT '告警ID',
        rule_id VARCHAR(36) COMMENT '规则ID',
        rule_name VARCHAR(200) COMMENT '规则名称',
        type VARCHAR(50) NOT NULL COMMENT '告警类型',
        level VARCHAR(20) NOT NULL COMMENT '告警级别',
        title VARCHAR(500) NOT NULL COMMENT '告警标题',
        message TEXT COMMENT '告警消息',
        source VARCHAR(100) COMMENT '告警来源',
        related_system VARCHAR(100) COMMENT '关联系统',
        related_module VARCHAR(100) COMMENT '关联模块',
        related_id VARCHAR(100) COMMENT '关联ID',
        details JSON COMMENT '告警详情',
        status ENUM('active', 'acknowledged', 'resolved', 'muted') DEFAULT 'active' COMMENT '状态',
        acknowledged_at TIMESTAMP NULL COMMENT '确认时间',
        acknowledged_by VARCHAR(36) COMMENT '确认人',
        resolved_at TIMESTAMP NULL COMMENT '解决时间',
        resolved_by VARCHAR(36) COMMENT '解决人',
        muted_until TIMESTAMP NULL COMMENT '静默截止时间',
        sent_channels JSON COMMENT '已发送的渠道',
        sent_at TIMESTAMP NULL COMMENT '发送时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_rule_id (rule_id),
        INDEX idx_type (type),
        INDEX idx_level (level),
        INDEX idx_status (status),
        INDEX idx_related_system (related_system),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='告警记录表'
    `);
    console.log('[API:Monitor:Init] alerts 表创建成功');

    // 3. 创建通知渠道配置表
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS notification_channels (
        id VARCHAR(36) PRIMARY KEY COMMENT '渠道ID',
        channel VARCHAR(50) NOT NULL COMMENT '渠道类型',
        name VARCHAR(200) NOT NULL COMMENT '渠道名称',
        enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
        config JSON COMMENT '渠道配置',
        smtp_host VARCHAR(255) COMMENT 'SMTP主机',
        smtp_port INT COMMENT 'SMTP端口',
        smtp_user VARCHAR(100) COMMENT 'SMTP用户',
        smtp_password VARCHAR(255) COMMENT 'SMTP密码',
        smtp_from VARCHAR(255) COMMENT '发件人地址',
        smtp_to VARCHAR(500) COMMENT '收件人地址',
        webhook_url VARCHAR(500) COMMENT 'Webhook URL',
        webhook_headers JSON COMMENT 'Webhook请求头',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        created_by VARCHAR(36) COMMENT '创建人',
        UNIQUE KEY uk_channel_name (channel, name),
        INDEX idx_channel (channel),
        INDEX idx_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知渠道配置表'
    `);
    console.log('[API:Monitor:Init] notification_channels 表创建成功');

    // 验证表是否创建成功
    const rulesResult = await dbManager.query<CountRow>(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'alert_rules'
    `);

    const alertsResult = await dbManager.query<CountRow>(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'alerts'
    `);

    const channelsResult = await dbManager.query<CountRow>(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'notification_channels'
    `);

    const alertRulesTableExists = rulesResult.rows?.[0]?.count > 0;
    const alertsTableExists = alertsResult.rows?.[0]?.count > 0;
    const notificationChannelsTableExists = channelsResult.rows?.[0]?.count > 0;

    if (!alertRulesTableExists || !alertsTableExists || !notificationChannelsTableExists) {
      return NextResponse.json(
        { success: false, error: '监控中心表创建失败' },
        { status: 500 }
      );
    }

    console.log('[API:Monitor:Init] 监控中心表初始化完成');

    return NextResponse.json({
      success: true,
      message: '监控中心表初始化成功',
      data: {
        alertRulesTable: alertRulesTableExists,
        alertsTable: alertsTableExists,
        notificationChannelsTable: notificationChannelsTableExists,
      },
    });
  } catch (error) {
    console.error('[API:Monitor:Init] 初始化失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '监控中心表初始化失败: ' + (error instanceof Error ? error.message : String(error)) 
      },
      { status: 500 }
    );
  }
}
