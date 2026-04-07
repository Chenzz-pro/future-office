import { NextRequest, NextResponse } from 'next/server';
import { dbManager } from '@/lib/database';

/**
 * 数据库初始化API
 * POST /api/admin/database/init-org-sync - 初始化组织架构同步相关表
 */

export async function POST(request: NextRequest) {
  try {
    const errors: string[] = [];

    // 1. 创建 org_sync_config 表
    try {
      await dbManager.query(`
        CREATE TABLE IF NOT EXISTS org_sync_config (
          id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
          config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
          config_value TEXT COMMENT '配置值（JSON字符串）',
          config_type VARCHAR(50) DEFAULT 'string' COMMENT '配置类型：string, number, boolean, json',
          description VARCHAR(500) COMMENT '配置说明',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          
          INDEX idx_config_key (config_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织架构同步配置表'
      `);
      console.log('[DatabaseInit] org_sync_config 表创建成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`创建 org_sync_config 表失败: ${errorMessage}`);
    }

    // 2. 插入默认配置
    const configs = [
      { key: 'sync.default_password', value: '123456', type: 'string', desc: '默认密码' },
      { key: 'sync.default_role_id', value: '00000000-0000-0000-0000-000000000003', type: 'string', desc: '默认角色ID' },
      { key: 'sync.enable_incremental_sync', value: 'true', type: 'boolean', desc: '启用增量同步' },
      { key: 'sync.incremental_sync_interval', value: '30', type: 'number', desc: '增量同步间隔' },
      { key: 'sync.enable_full_sync', value: 'true', type: 'boolean', desc: '启用全量同步' },
      { key: 'sync.full_sync_interval', value: '720', type: 'number', desc: '全量同步间隔' },
      { key: 'sync.batch_size', value: '500', type: 'number', desc: '批次大小' },
      { key: 'sync.enable_monitor', value: 'true', type: 'boolean', desc: '启用监控' },
      { key: 'sync.alert_on_failure', value: 'true', type: 'boolean', desc: '失败告警' },
      { key: 'sync.alert_on_data_anomaly', value: 'true', type: 'boolean', desc: '数据异常告警' },
      { key: 'sync.alert_on_sync_delay', value: 'true', type: 'boolean', desc: '延迟告警' },
      { key: 'sync.sync_delay_threshold', value: '120', type: 'number', desc: '延迟阈值' },
      { key: 'sync.data_anomaly_threshold', value: '10000', type: 'number', desc: '异常阈值' },
      { key: 'sync.data_anomaly_lower_threshold', value: '10', type: 'number', desc: '异常下限' },
      { key: 'sync.filter_inactive_users', value: 'true', type: 'boolean', desc: '过滤禁用用户' },
      { key: 'sync.notification_channels', value: '["email"]', type: 'json', desc: '通知渠道' },
      { key: 'sync.scheduler_config', value: '{"incremental":{"enabled":true,"interval":30,"startTime":"00:00"},"full":{"enabled":true,"interval":720,"startTime":"02:00","dayOfMonth":1},"monitor":{"enabled":true,"interval":5,"startTime":"00:00"}}', type: 'json', desc: '调度器配置' }
    ];

    for (const config of configs) {
      try {
        await dbManager.query(`
          INSERT INTO org_sync_config (id, config_key, config_value, config_type, description)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)
        `, [crypto.randomUUID(), config.key, config.value, config.type, config.desc]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`插入配置 ${config.key} 失败: ${errorMessage}`);
      }
    }

    // 3. 创建 org_sync_tokens 表
    try {
      await dbManager.query(`
        CREATE TABLE IF NOT EXISTS org_sync_tokens (
          id VARCHAR(36) PRIMARY KEY COMMENT '令牌ID',
          token_name VARCHAR(100) NOT NULL UNIQUE COMMENT '令牌名称',
          token_value VARCHAR(100) COMMENT '令牌值（时间戳）',
          last_sync_time TIMESTAMP NULL COMMENT '上次同步时间',
          token_type ENUM('timestamp', 'page_token') DEFAULT 'timestamp' COMMENT '令牌类型',
          
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          
          INDEX idx_token_name (token_name),
          INDEX idx_token_type (token_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织架构同步令牌表'
      `);
      console.log('[DatabaseInit] org_sync_tokens 表创建成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`创建 org_sync_tokens 表失败: ${errorMessage}`);
    }

    // 4. 创建 sync_alerts 表
    try {
      await dbManager.query(`
        CREATE TABLE IF NOT EXISTS sync_alerts (
          id VARCHAR(36) PRIMARY KEY COMMENT '告警ID',
          alert_type VARCHAR(50) NOT NULL COMMENT '告警类型',
          severity ENUM('critical', 'warning', 'info') NOT NULL COMMENT '严重程度',
          title VARCHAR(200) COMMENT '告警标题',
          message TEXT NOT NULL COMMENT '告警消息',
          details JSON COMMENT '告警详情',

          is_read TINYINT(1) DEFAULT 0 COMMENT '是否已读',
          is_resolved TINYINT(1) DEFAULT 0 COMMENT '是否已解决',
          is_cleared TINYINT(1) DEFAULT 0 COMMENT '是否已清除',

          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          resolved_at TIMESTAMP NULL COMMENT '解决时间',
          cleared_at TIMESTAMP NULL COMMENT '清除时间',

          related_sync_log_id VARCHAR(36) COMMENT '关联的同步日志ID',
          related_config_key VARCHAR(100) COMMENT '关联的配置键',

          INDEX idx_alert_type (alert_type),
          INDEX idx_severity (severity),
          INDEX idx_is_read (is_read),
          INDEX idx_is_resolved (is_resolved),
          INDEX idx_is_cleared (is_cleared),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步告警表'
      `);
      console.log('[DatabaseInit] sync_alerts 表创建成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`创建 sync_alerts 表失败: ${errorMessage}`);
    }

    // 5. 插入默认令牌
    try {
      await dbManager.query(`
        INSERT INTO org_sync_tokens (id, token_name, token_value, token_type)
        VALUES (?, ?, NULL, 'timestamp')
        ON DUPLICATE KEY UPDATE token_value = VALUES(token_value)
      `, [crypto.randomUUID(), 'last_sync_timestamp']);
      
      await dbManager.query(`
        INSERT INTO org_sync_tokens (id, token_name, token_value, token_type)
        VALUES (?, ?, NULL, 'page_token')
        ON DUPLICATE KEY UPDATE token_value = VALUES(token_value)
      `, [crypto.randomUUID(), 'current_page_token']);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`插入默认令牌失败: ${errorMessage}`);
    }

    return NextResponse.json({
      success: true,
      message: '组织架构同步表初始化完成',
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('[DatabaseInit] 初始化失败:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
