/**
 * 全局监控中心 Repository
 * 管理告警规则和告警记录
 */

import { dbManager } from '../database/manager';
import {
  AlertRule,
  Alert,
  ChannelConfig,
  AlertStats,
  AlertLevel,
  AlertType,
  NotificationChannel,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  CreateAlertRequest,
} from './types';

/**
 * 监控中心 Repository
 */
export class MonitorRepository {
  /**
   * 初始化监控表
   */
  async initTables(): Promise<void> {
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
        smtp_from VARCHAR(200) COMMENT '发件人',
        webhook_url VARCHAR(500) COMMENT 'Webhook地址',
        webhook_headers JSON COMMENT 'Webhook请求头',
        webhook_method VARCHAR(10) DEFAULT 'POST' COMMENT '请求方法',
        dingtalk_webhook VARCHAR(500) COMMENT '钉钉Webhook',
        dingtalk_secret VARCHAR(200) COMMENT '钉钉密钥',
        wechat_work_webhook VARCHAR(500) COMMENT '企微Webhook',
        wechat_work_agent_id VARCHAR(50) COMMENT '企微AgentId',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        UNIQUE KEY uk_channel_name (channel, name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知渠道配置表'
    `);

    console.log('[MonitorRepository] 监控表初始化完成');
  }

  // ==================== 告警规则 ====================

  /**
   * 创建告警规则
   */
  async createAlertRule(request: CreateAlertRuleRequest, createdBy?: string): Promise<AlertRule | null> {
    const id = crypto.randomUUID();

    await dbManager.query(
      `INSERT INTO alert_rules (
        id, name, description, type, level, enabled, conditions,
        related_system, related_module,
        notification_channels, notification_recipients, notification_webhooks,
        cooldown_minutes, max_alerts_per_hour, metadata, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        request.name,
        request.description,
        request.type,
        request.level,
        request.enabled ?? true,
        JSON.stringify(request.conditions),
        request.relatedSystem,
        request.relatedModule,
        JSON.stringify(request.notificationConfig.channels),
        request.notificationConfig.recipients ? JSON.stringify(request.notificationConfig.recipients) : null,
        request.notificationConfig.webhookUrls ? JSON.stringify(request.notificationConfig.webhookUrls) : null,
        request.notificationConfig.cooldownMinutes ?? 5,
        request.notificationConfig.maxAlertsPerHour,
        request.metadata ? JSON.stringify(request.metadata) : null,
        createdBy,
      ]
    );

    const rule = await this.getAlertRuleById(id);
    return rule ?? null;
  }

  /**
   * 更新告警规则
   */
  async updateAlertRule(request: UpdateAlertRuleRequest): Promise<AlertRule | null> {
    const existing = await this.getAlertRuleById(request.id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (request.name !== undefined) {
      updates.push('name = ?');
      values.push(request.name);
    }
    if (request.description !== undefined) {
      updates.push('description = ?');
      values.push(request.description);
    }
    if (request.type !== undefined) {
      updates.push('type = ?');
      values.push(request.type);
    }
    if (request.level !== undefined) {
      updates.push('level = ?');
      values.push(request.level);
    }
    if (request.enabled !== undefined) {
      updates.push('enabled = ?');
      values.push(request.enabled);
    }
    if (request.conditions !== undefined) {
      updates.push('conditions = ?');
      values.push(JSON.stringify(request.conditions));
    }
    if (request.relatedSystem !== undefined) {
      updates.push('related_system = ?');
      values.push(request.relatedSystem);
    }
    if (request.relatedModule !== undefined) {
      updates.push('related_module = ?');
      values.push(request.relatedModule);
    }
    if (request.notificationConfig !== undefined) {
      updates.push('notification_channels = ?');
      values.push(JSON.stringify(request.notificationConfig.channels));
      updates.push('notification_recipients = ?');
      values.push(request.notificationConfig.recipients ? JSON.stringify(request.notificationConfig.recipients) : null);
      updates.push('notification_webhooks = ?');
      values.push(request.notificationConfig.webhookUrls ? JSON.stringify(request.notificationConfig.webhookUrls) : null);
      if (request.notificationConfig.cooldownMinutes !== undefined) {
        updates.push('cooldown_minutes = ?');
        values.push(request.notificationConfig.cooldownMinutes);
      }
      if (request.notificationConfig.maxAlertsPerHour !== undefined) {
        updates.push('max_alerts_per_hour = ?');
        values.push(request.notificationConfig.maxAlertsPerHour);
      }
    }
    if (request.metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(JSON.stringify(request.metadata));
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(request.id);
    await dbManager.query(`UPDATE alert_rules SET ${updates.join(', ')} WHERE id = ?`, values);

    return this.getAlertRuleById(request.id);
  }

  /**
   * 删除告警规则
   */
  async deleteAlertRule(id: string): Promise<boolean> {
    const result = await dbManager.query('DELETE FROM alert_rules WHERE id = ?', [id]);
    return (result.affectedRows ?? 0) > 0;
  }

  /**
   * 根据ID获取告警规则
   */
  async getAlertRuleById(id: string): Promise<AlertRule | null> {
    const result = await dbManager.query('SELECT * FROM alert_rules WHERE id = ?', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToAlertRule(result.rows[0]);
  }

  /**
   * 获取所有告警规则
   */
  async getAllAlertRules(filters?: {
    type?: AlertType;
    level?: AlertLevel;
    enabled?: boolean;
    relatedSystem?: string;
  }): Promise<AlertRule[]> {
    let sql = 'SELECT * FROM alert_rules WHERE 1=1';
    const params: unknown[] = [];

    if (filters?.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }
    if (filters?.level) {
      sql += ' AND level = ?';
      params.push(filters.level);
    }
    if (filters?.enabled !== undefined) {
      sql += ' AND enabled = ?';
      params.push(filters.enabled);
    }
    if (filters?.relatedSystem) {
      sql += ' AND related_system = ?';
      params.push(filters.relatedSystem);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await dbManager.query(sql, params);
    return result.rows.map(row => this.mapRowToAlertRule(row));
  }

  // ==================== 告警记录 ====================

  /**
   * 创建告警
   */
  async createAlert(request: CreateAlertRequest): Promise<Alert | null> {
    const id = crypto.randomUUID();

    await dbManager.query(
      `INSERT INTO alerts (
        id, rule_id, rule_name, type, level, title, message,
        source, related_system, related_module, related_id, details,
        status, sent_channels, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        request.ruleId,
        request.ruleName,
        request.type,
        request.level,
        request.title,
        request.message,
        request.source,
        request.relatedSystem,
        request.relatedModule,
        request.relatedId,
        request.details ? JSON.stringify(request.details) : null,
        'active',
        null,
        null,
      ]
    );

    const alert = await this.getAlertById(id);
    return alert ?? null;
  }

  /**
   * 获取告警
   */
  async getAlertById(id: string): Promise<Alert | null> {
    const result = await dbManager.query('SELECT * FROM alerts WHERE id = ?', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToAlert(result.rows[0]);
  }

  /**
   * 获取告警列表
   */
  async getAlerts(filters?: {
    status?: 'active' | 'acknowledged' | 'resolved' | 'muted';
    level?: AlertLevel;
    type?: AlertType;
    relatedSystem?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: Alert[]; total: number }> {
    let sql = 'SELECT * FROM alerts WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM alerts WHERE 1=1';
    const params: unknown[] = [];
    const countParams: unknown[] = [];

    if (filters?.status) {
      sql += ' AND status = ?';
      countSql += ' AND status = ?';
      params.push(filters.status);
      countParams.push(filters.status);
    }
    if (filters?.level) {
      sql += ' AND level = ?';
      countSql += ' AND level = ?';
      params.push(filters.level);
      countParams.push(filters.level);
    }
    if (filters?.type) {
      sql += ' AND type = ?';
      countSql += ' AND type = ?';
      params.push(filters.type);
      countParams.push(filters.type);
    }
    if (filters?.relatedSystem) {
      sql += ' AND related_system = ?';
      countSql += ' AND related_system = ?';
      params.push(filters.relatedSystem);
      countParams.push(filters.relatedSystem);
    }
    if (filters?.startDate) {
      sql += ' AND created_at >= ?';
      countSql += ' AND created_at >= ?';
      params.push(filters.startDate);
      countParams.push(filters.startDate);
    }
    if (filters?.endDate) {
      sql += ' AND created_at <= ?';
      countSql += ' AND created_at <= ?';
      params.push(filters.endDate);
      countParams.push(filters.endDate);
    }

    // 获取总数
    const countResult = await dbManager.query(countSql, countParams);
    const total = (countResult.rows[0] as { total: number })?.total ?? 0;

    // 分页
    sql += ' ORDER BY created_at DESC';
    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
      if (filters?.offset) {
        sql += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const result = await dbManager.query(sql, params);
    return {
      alerts: result.rows.map(row => this.mapRowToAlert(row)),
      total,
    };
  }

  /**
   * 更新告警状态
   */
  async updateAlertStatus(
    id: string,
    status: 'acknowledged' | 'resolved' | 'muted',
    userId?: string
  ): Promise<void> {
    const updates: string[] = ['status = ?'];
    const values: unknown[] = [status];

    if (status === 'acknowledged') {
      updates.push('acknowledged_at = NOW()');
      if (userId) {
        updates.push('acknowledged_by = ?');
        values.push(userId);
      }
    } else if (status === 'resolved') {
      updates.push('resolved_at = NOW()');
      if (userId) {
        updates.push('resolved_by = ?');
        values.push(userId);
      }
    } else if (status === 'muted') {
      updates.push('muted_until = DATE_ADD(NOW(), INTERVAL 1 HOUR)');
    }

    values.push(id);
    await dbManager.query(`UPDATE alerts SET ${updates.join(', ')} WHERE id = ?`, values);
  }

  /**
   * 获取告警统计
   */
  async getAlertStats(relatedSystem?: string): Promise<AlertStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let whereClause = '';
    const params: unknown[] = [];
    if (relatedSystem) {
      whereClause = ' WHERE related_system = ?';
      params.push(relatedSystem);
    }

    // 总体统计
    const totalResult = await dbManager.query<{ total: number; active: number; acknowledged: number; resolved: number }>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'acknowledged' THEN 1 ELSE 0 END) as acknowledged,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
       FROM alerts${whereClause}`,
      params
    );

    // 按级别统计
    const levelResult = await dbManager.query(
      `SELECT level, COUNT(*) as count FROM alerts${whereClause} GROUP BY level`,
      params
    );

    // 按类型统计
    const typeResult = await dbManager.query(
      `SELECT type, COUNT(*) as count FROM alerts${whereClause} GROUP BY type`,
      params
    );

    // 按系统统计
    const systemResult = await dbManager.query(
      `SELECT related_system, COUNT(*) as count FROM alerts${whereClause} GROUP BY related_system`,
      params
    );

    const stats = totalResult.rows[0];

    const byLevel = {} as Record<AlertLevel, number>;
    (levelResult.rows as Array<{ level: string; count: number }>).forEach(row => {
      byLevel[row.level as AlertLevel] = row.count;
    });

    const byType = {} as Record<AlertType, number>;
    (typeResult.rows as Array<{ type: string; count: number }>).forEach(row => {
      byType[row.type as AlertType] = row.count;
    });

    const bySystem: Record<string, number> = {};
    (systemResult.rows as Array<{ related_system: string | null; count: number }>).forEach(row => {
      if (row.related_system) {
        bySystem[row.related_system as string] = row.count;
      }
    });

    return {
      total: stats?.total ?? 0,
      active: stats?.active ?? 0,
      acknowledged: stats?.acknowledged ?? 0,
      resolved: stats?.resolved ?? 0,
      byLevel,
      byType,
      bySystem,
      recentTrend: [],
    };
  }

  /**
   * 获取活跃告警数
   */
  async getActiveAlertCount(): Promise<number> {
    const result = await dbManager.query<{ count: number }>(
      "SELECT COUNT(*) as count FROM alerts WHERE status = 'active'"
    );
    return result.rows[0]?.count ?? 0;
  }

  // ==================== 通知渠道 ====================

  /**
   * 获取所有通知渠道
   */
  async getAllChannels(): Promise<ChannelConfig[]> {
    const result = await dbManager.query('SELECT * FROM notification_channels ORDER BY created_at DESC');
    return result.rows.map(row => this.mapRowToChannel(row));
  }

  /**
   * 创建/更新通知渠道
   */
  async saveChannel(channel: Omit<ChannelConfig, 'createdAt' | 'updatedAt'>): Promise<ChannelConfig | null> {
    const existing = await dbManager.query<{ id: string }>(
      'SELECT id FROM notification_channels WHERE channel = ? AND name = ?',
      [channel.channel, channel.name]
    );

    if (existing.rows.length > 0) {
      // 更新
      await dbManager.query(
        `UPDATE notification_channels SET
          enabled = ?, config = ?,
          smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_password = ?, smtp_from = ?,
          webhook_url = ?, webhook_headers = ?, webhook_method = ?,
          dingtalk_webhook = ?, dingtalk_secret = ?,
          wechat_work_webhook = ?, wechat_work_agent_id = ?
         WHERE id = ?`,
        [
          channel.enabled,
          JSON.stringify(channel.config),
          channel.smtpHost,
          channel.smtpPort,
          channel.smtpUser,
          channel.smtpPassword,
          channel.smtpFrom,
          channel.webhookUrl,
          channel.webhookHeaders ? JSON.stringify(channel.webhookHeaders) : null,
          channel.webhookMethod,
          channel.dingtalkWebhook,
          channel.dingtalkSecret,
          channel.wechatWorkWebhook,
          channel.wechatWorkAgentId,
          existing.rows[0].id,
        ]
      );
      return this.getChannelById(existing.rows[0].id);
    } else {
      // 创建
      const id = crypto.randomUUID();
      await dbManager.query(
        `INSERT INTO notification_channels (
          id, channel, name, enabled, config,
          smtp_host, smtp_port, smtp_user, smtp_password, smtp_from,
          webhook_url, webhook_headers, webhook_method,
          dingtalk_webhook, dingtalk_secret,
          wechat_work_webhook, wechat_work_agent_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          channel.channel,
          channel.name,
          channel.enabled,
          JSON.stringify(channel.config),
          channel.smtpHost,
          channel.smtpPort,
          channel.smtpUser,
          channel.smtpPassword,
          channel.smtpFrom,
          channel.webhookUrl,
          channel.webhookHeaders ? JSON.stringify(channel.webhookHeaders) : null,
          channel.webhookMethod,
          channel.dingtalkWebhook,
          channel.dingtalkSecret,
          channel.wechatWorkWebhook,
          channel.wechatWorkAgentId,
        ]
      );
      return this.getChannelById(id);
    }
  }

  /**
   * 根据ID获取渠道
   */
  async getChannelById(id: string): Promise<ChannelConfig | null> {
    const result = await dbManager.query('SELECT * FROM notification_channels WHERE id = ?', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToChannel(result.rows[0]);
  }

  // ==================== 映射函数 ====================

  private mapRowToAlertRule(row: unknown): AlertRule {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name: r.name as string,
      description: r.description as string | undefined,
      type: r.type as AlertType,
      level: r.level as AlertLevel,
      enabled: Boolean(r.enabled),
      conditions: r.conditions ? JSON.parse(r.conditions as string) : [],
      relatedSystem: r.related_system as string | undefined,
      relatedModule: r.related_module as string | undefined,
      notificationConfig: {
        channels: r.notification_channels ? JSON.parse(r.notification_channels as string) : [],
        recipients: r.notification_recipients ? JSON.parse(r.notification_recipients as string) : undefined,
        webhookUrls: r.notification_webhooks ? JSON.parse(r.notification_webhooks as string) : undefined,
        cooldownMinutes: r.cooldown_minutes as number | undefined,
        maxAlertsPerHour: r.max_alerts_per_hour as number | undefined,
      },
      metadata: r.metadata ? JSON.parse(r.metadata as string) : undefined,
      createdAt: new Date(r.created_at as string),
      updatedAt: new Date(r.updated_at as string),
      createdBy: r.created_by as string | undefined,
    };
  }

  private mapRowToAlert(row: unknown): Alert {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      ruleId: r.rule_id as string | undefined,
      ruleName: r.rule_name as string | undefined,
      type: r.type as AlertType,
      level: r.level as AlertLevel,
      title: r.title as string,
      message: (r.message as string) || '',
      source: r.source as string | undefined,
      relatedSystem: r.related_system as string | undefined,
      relatedModule: r.related_module as string | undefined,
      relatedId: r.related_id as string | undefined,
      details: r.details ? JSON.parse(r.details as string) : undefined,
      status: r.status as 'active' | 'acknowledged' | 'resolved' | 'muted',
      acknowledgedAt: r.acknowledged_at ? new Date(r.acknowledged_at as string) : undefined,
      acknowledgedBy: r.acknowledged_by as string | undefined,
      resolvedAt: r.resolved_at ? new Date(r.resolved_at as string) : undefined,
      resolvedBy: r.resolved_by as string | undefined,
      mutedUntil: r.muted_until ? new Date(r.muted_until as string) : undefined,
      sentChannels: r.sent_channels ? JSON.parse(r.sent_channels as string) : [],
      sentAt: r.sent_at ? new Date(r.sent_at as string) : undefined,
      createdAt: new Date(r.created_at as string),
    };
  }

  private mapRowToChannel(row: unknown): ChannelConfig {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      channel: r.channel as NotificationChannel,
      name: r.name as string,
      enabled: Boolean(r.enabled),
      config: r.config ? JSON.parse(r.config as string) : {},
      smtpHost: r.smtp_host as string | undefined,
      smtpPort: r.smtp_port as number | undefined,
      smtpUser: r.smtp_user as string | undefined,
      smtpPassword: r.smtp_password as string | undefined,
      smtpFrom: r.smtp_from as string | undefined,
      webhookUrl: r.webhook_url as string | undefined,
      webhookHeaders: r.webhook_headers ? JSON.parse(r.webhook_headers as string) : undefined,
      webhookMethod: r.webhook_method as 'GET' | 'POST' | 'PUT' | undefined,
      dingtalkWebhook: r.dingtalk_webhook as string | undefined,
      dingtalkSecret: r.dingtalk_secret as string | undefined,
      wechatWorkWebhook: r.wechat_work_webhook as string | undefined,
      wechatWorkAgentId: r.wechat_work_agent_id as string | undefined,
      createdAt: new Date(r.created_at as string),
      updatedAt: new Date(r.updated_at as string),
    };
  }
}

export const monitorRepository = new MonitorRepository();
