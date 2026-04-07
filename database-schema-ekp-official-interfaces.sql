-- ============================================
-- EKP官方接口配置表
-- 存储蓝凌EKP系统官方提供的接口
-- ============================================
CREATE TABLE IF NOT EXISTS ekp_official_interfaces (
  id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  interface_code VARCHAR(100) UNIQUE NOT NULL COMMENT '接口代码（如：todo.getTodo）',
  interface_name VARCHAR(200) NOT NULL COMMENT '接口名称',
  interface_category VARCHAR(50) COMMENT '接口分类：通知、流程、文档、组织等',
  api_path VARCHAR(500) NOT NULL COMMENT 'API路径（相对路径）',
  service_id VARCHAR(100) COMMENT '服务标识（REST Service名称）',
  http_method VARCHAR(10) DEFAULT 'POST' COMMENT 'HTTP方法',
  request_template JSON COMMENT '请求参数模板',
  response_parser JSON COMMENT '响应解析规则',
  description TEXT COMMENT '接口描述',
  version VARCHAR(20) COMMENT '接口版本（如：10.0）',
  enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  is_system BOOLEAN DEFAULT FALSE COMMENT '是否系统内置（不可删除）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(36) COMMENT '创建人ID',
  updated_by VARCHAR(36) COMMENT '更新人ID',
  INDEX idx_category (interface_category),
  INDEX idx_code (interface_code),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='EKP官方接口配置表';
