-- ============================================
-- 监控告警表
-- ============================================

-- 告警表
CREATE TABLE IF NOT EXISTS sync_alerts (
  id VARCHAR(36) PRIMARY KEY COMMENT '告警ID',
  alert_type VARCHAR(50) NOT NULL COMMENT '告警类型：sync_failure-同步失败，data_anomaly-数据异常，sync_delay-同步延迟，sync_timeout-同步超时，ekp_connection_error-EKP连接错误',
  severity ENUM('critical', 'warning', 'info') NOT NULL COMMENT '严重程度：critical-严重，warning-警告，info-信息',
  title VARCHAR(200) COMMENT '告警标题',
  message TEXT NOT NULL COMMENT '告警消息',
  details JSON COMMENT '告警详情（JSON格式）',

  -- 状态
  is_read TINYINT(1) DEFAULT 0 COMMENT '是否已读：0-未读，1-已读',
  is_resolved TINYINT(1) DEFAULT 0 COMMENT '是否已解决：0-未解决，1-已解决',
  is_cleared TINYINT(1) DEFAULT 0 COMMENT '是否已清除：0-未清除，1-已清除',

  -- 时间
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  resolved_at TIMESTAMP NULL COMMENT '解决时间',
  cleared_at TIMESTAMP NULL COMMENT '清除时间',

  -- 关联信息
  related_sync_log_id VARCHAR(36) COMMENT '关联的同步日志ID',
  related_config_key VARCHAR(100) COMMENT '关联的配置键',

  INDEX idx_alert_type (alert_type),
  INDEX idx_severity (severity),
  INDEX idx_is_read (is_read),
  INDEX idx_is_resolved (is_resolved),
  INDEX idx_is_cleared (is_cleared),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='同步告警表';
