-- ============================================
-- 组织架构同步相关表
-- ============================================

-- 1. 同步日志表
CREATE TABLE IF NOT EXISTS org_sync_logs (
  id VARCHAR(36) PRIMARY KEY COMMENT '同步日志ID',
  sync_type ENUM('full', 'incremental') NOT NULL COMMENT '同步类型：full-全量，incremental-增量',
  sync_mode ENUM('time', 'org', 'all') DEFAULT 'all' COMMENT '同步模式：time-按时间范围，org-按机构范围，all-全部',
  status ENUM('running', 'completed', 'failed', 'cancelled') NOT NULL COMMENT '状态',
  start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
  end_time TIMESTAMP NULL COMMENT '结束时间',
  duration_seconds INT COMMENT '耗时（秒）',

  -- 增量同步相关
  begin_time_stamp VARCHAR(50) COMMENT '开始时间戳（yyyy-MM-dd HH:mm:ss.SSS）',
  end_time_stamp VARCHAR(50) COMMENT '结束时间戳（yyyy-MM-dd HH:mm:ss.SSS）',
  next_time_stamp VARCHAR(50) COMMENT '下次同步的起始时间戳',

  -- 机构范围同步
  org_scope JSON COMMENT '机构范围（机构ID列表）',

  -- 同步的组织类型
  return_org_type JSON COMMENT '同步的组织类型 [{"type":"org"},{"type":"dept"},{"type":"post"},{"type":"person"}]',

  -- 统计信息
  total_count INT DEFAULT 0 COMMENT '总处理数据量',
  org_count INT DEFAULT 0 COMMENT '机构数量',
  dept_count INT DEFAULT 0 COMMENT '部门数量',
  post_count INT DEFAULT 0 COMMENT '岗位数量',
  group_count INT DEFAULT 0 COMMENT '群组数量',
  person_count INT DEFAULT 0 COMMENT '人员数量',
  insert_count INT DEFAULT 0 COMMENT '新增数量',
  update_count INT DEFAULT 0 COMMENT '更新数量',
  delete_count INT DEFAULT 0 COMMENT '软删除数量',
  error_count INT DEFAULT 0 COMMENT '错误数量',

  -- 错误信息
  error_message TEXT COMMENT '错误信息',
  error_details JSON COMMENT '错误详情（失败的记录列表）',

  -- 其他
  triggered_by VARCHAR(50) COMMENT '触发方式：manual-手动，scheduled-定时，webhook-回调',
  operator_id VARCHAR(36) COMMENT '操作人ID',
  operator_name VARCHAR(100) COMMENT '操作人姓名',
  remark TEXT COMMENT '备注',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  INDEX idx_sync_type (sync_type),
  INDEX idx_status (status),
  INDEX idx_start_time (start_time),
  INDEX idx_triggered_by (triggered_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织架构同步日志表';

-- 2. 同步明细表
CREATE TABLE IF NOT EXISTS org_sync_details (
  id VARCHAR(36) PRIMARY KEY COMMENT '明细ID',
  sync_log_id VARCHAR(36) NOT NULL COMMENT '同步日志ID',
  data_type ENUM('org', 'dept', 'group', 'post', 'person') NOT NULL COMMENT '数据类型',
  action ENUM('insert', 'update', 'delete', 'skip', 'error') NOT NULL COMMENT '操作类型',
  ekp_id VARCHAR(100) NOT NULL COMMENT 'EKP ID',
  ekp_lunid VARCHAR(100) COMMENT 'EKP LUNID（可作为主键）',
  local_id VARCHAR(36) COMMENT '本地ID',
  ekp_name VARCHAR(200) COMMENT 'EKP名称',

  -- 数据快照
  old_data JSON COMMENT '修改前数据',
  new_data JSON COMMENT '修改后数据',

  -- 错误信息
  error_message TEXT COMMENT '错误信息',
  error_code VARCHAR(50) COMMENT '错误码',

  -- 同步批次（用于分页同步）
  batch_no INT COMMENT '批次号',
  is_processed TINYINT(1) DEFAULT 1 COMMENT '是否已处理',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

  INDEX idx_sync_log_id (sync_log_id),
  INDEX idx_ekp_id (ekp_id),
  INDEX idx_data_type (data_type),
  INDEX idx_action (action),
  FOREIGN KEY (sync_log_id) REFERENCES org_sync_logs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='组织架构同步明细表';

-- 3. 同步令牌表（存储增量同步的时间戳）
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

-- 4. 同步配置表
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

-- ============================================
-- 初始化默认配置
-- ============================================

-- 插入默认配置
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
(UUID(), 'sync.filter_inactive_users', 'true', 'boolean', '是否过滤离职人员/禁用账号'),
(UUID(), 'sync.notification_channels', '["email"]', 'json', '通知渠道：email, sms, webhook')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- 插入默认同步令牌
INSERT INTO org_sync_tokens (id, token_name, token_value, token_type) VALUES
(UUID(), 'last_sync_timestamp', NULL, 'timestamp'),
(UUID(), 'current_page_token', NULL, 'page_token')
ON DUPLICATE KEY UPDATE token_value = VALUES(token_value);
