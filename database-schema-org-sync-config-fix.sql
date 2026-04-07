-- ============================================
-- 组织架构同步配置表（修复版）
-- ============================================

-- 1. 同步配置表
CREATE TABLE IF NOT EXISTS org_sync_config (
  id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
  config_value TEXT COMMENT '配置值（JSON字符串）',
  config_type VARCHAR(50) DEFAULT 'string' COMMENT '配置类型：string, number, boolean, json',
  description VARCHAR(500) COMMENT '配置说明',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织架构同步配置表';

-- 2. 插入默认配置
INSERT INTO org_sync_config (id, config_key, config_value, config_type, description) VALUES
(UUID(), 'sync.default_password', '123456', 'string', '默认密码'),
(UUID(), 'sync.default_role_id', '00000000-0000-0000-0000-000000000003', 'string', '默认角色ID（普通用户）'),
(UUID(), 'sync.enable_incremental_sync', 'true', 'boolean', '是否启用增量同步'),
(UUID(), 'sync.incremental_sync_interval', '30', 'number', '增量同步间隔（分钟）'),
(UUID(), 'sync.enable_full_sync', 'true', 'boolean', '是否启用全量同步'),
(UUID(), 'sync.full_sync_interval', '720', 'number', '全量同步间隔（小时，默认每月一次）'),
(UUID(), 'sync.batch_size', '500', 'number', '每批处理的数量'),
(UUID(), 'sync.enable_monitor', 'true', 'boolean', '是否启用监控'),
(UUID(), 'sync.alert_on_failure', 'true', 'boolean', '同步失败时是否告警'),
(UUID(), 'sync.alert_on_data_anomaly', 'true', 'boolean', '数据量异常时是否告警'),
(UUID(), 'sync.alert_on_sync_delay', 'true', 'boolean', '同步延迟时是否告警'),
(UUID(), 'sync.sync_delay_threshold', '120', 'number', '同步延迟阈值（秒）'),
(UUID(), 'sync.data_anomaly_threshold', '10000', 'number', '数据异常阈值（条）'),
(UUID(), 'sync.data_anomaly_lower_threshold', '10', 'number', '数据异常下限阈值（条）'),
(UUID(), 'sync.filter_inactive_users', 'true', 'boolean', '是否过滤离职人员/禁用账号'),
(UUID(), 'sync.notification_channels', '["email"]', 'json', '通知渠道：email, sms, webhook')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- 3. 插入默认调度器配置
INSERT INTO org_sync_config (id, config_key, config_value, config_type, description) VALUES
(UUID(), 'sync.scheduler_config', '{"incremental":{"enabled":true,"interval":30,"startTime":"00:00"},"full":{"enabled":true,"interval":720,"startTime":"02:00","dayOfMonth":1},"monitor":{"enabled":true,"interval":5,"startTime":"00:00"}}', 'json', '定时任务调度器配置')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- 4. 同步令牌表
CREATE TABLE IF NOT EXISTS org_sync_tokens (
  id VARCHAR(36) PRIMARY KEY COMMENT '令牌ID',
  token_name VARCHAR(100) NOT NULL UNIQUE COMMENT '令牌名称',
  token_value VARCHAR(100) COMMENT '令牌值（时间戳）',
  last_sync_time TIMESTAMP NULL COMMENT '上次同步时间',
  token_type ENUM('timestamp', 'page_token') DEFAULT 'timestamp' COMMENT '令牌类型：timestamp-时间戳，page_token-分页令牌',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_token_name (token_name),
  INDEX idx_token_type (token_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织架构同步令牌表';

-- 5. 插入默认同步令牌
INSERT INTO org_sync_tokens (id, token_name, token_value, token_type) VALUES
(UUID(), 'last_sync_timestamp', NULL, 'timestamp'),
(UUID(), 'current_page_token', NULL, 'page_token')
ON DUPLICATE KEY UPDATE token_value = VALUES(token_value);
